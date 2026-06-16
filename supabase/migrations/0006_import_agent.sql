-- dots — KI-Import-Agent: Matching + Promote-RPCs (Phase 6)
-- Nutzt die in 0001 bereits angelegten GIN-Indizes (venues_name_trgm,
-- events_title_trgm) sowie is_admin() aus 0001. Keine Tabellen-/Policy-Änderung
-- nötig: imported_event_candidates + RLS-Policy "candidates_admin" existieren.

-- Diakritika-Normalisierung für robustes Venue-Matching (Südbahnhof/Suedbahnhof).
create extension if not exists unaccent;

-- ── match_venue: bestes Venue per Fuzzy-Namensvergleich (kein ILIKE) ─────────
-- Gibt die UUID der ähnlichsten Venue zurück oder NULL. unaccent + lower machen
-- den Vergleich akzent-/groß-klein-unabhängig.
create or replace function match_venue(in_name text)
returns uuid
language sql stable as $$
  select v.id
  from venues v
  where in_name is not null
    and char_length(btrim(in_name)) >= 3
    and similarity(unaccent(lower(v.name)), unaccent(lower(in_name))) > 0.3
  order by similarity(unaccent(lower(v.name)), unaccent(lower(in_name))) desc
  limit 1;
$$;

-- ── find_duplicate_events: bestehende Events mit ähnlichem Titel im Zeitfenster ─
create or replace function find_duplicate_events(
  in_title    text,
  in_start_at timestamptz,
  in_window   interval default interval '3 days'
)
returns setof events
language sql stable as $$
  select e.*
  from events e
  where in_title is not null
    and e.status <> 'rejected'
    and e.start_at between in_start_at - in_window and in_start_at + in_window
    and similarity(lower(e.title), lower(in_title)) > 0.3
  order by similarity(lower(e.title), lower(in_title)) desc
  limit 5;
$$;

-- ── promote_candidate: Kandidat → echtes Event (atomar) ─────────────────────
-- Liest `extracted` (jsonb), merged optionale Overrides (z. B. venue_id aus dem
-- Review-Modal), baut start/end als Europe/Berlin-Zeit, matcht Venue/Kategorie
-- und legt das Event als 'pending_review' an. Markiert den Kandidaten 'approved'.
-- Autorisierung: nur Admin/Editor (is_admin) ODER Service-Role (Admin-Backend).
create or replace function promote_candidate(
  in_candidate_id uuid,
  in_overrides    jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role     text;
  c            imported_event_candidates%rowtype;
  ex           jsonb;
  v_title      text;
  v_date       text;
  v_start_t    text;
  v_end_t      text;
  v_start      timestamptz;
  v_end        timestamptz;
  v_venue      uuid;
  v_category   uuid;
  v_price_type price_type;
  v_price_min  numeric;
  v_new_id     uuid;
begin
  jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  if jwt_role <> 'service_role' and not is_admin() then
    raise exception 'promote_candidate: not authorized';
  end if;

  select * into c from imported_event_candidates where id = in_candidate_id;
  if not found then
    raise exception 'promote_candidate: candidate % not found', in_candidate_id;
  end if;

  ex := coalesce(c.extracted, '{}'::jsonb) || coalesce(in_overrides, '{}'::jsonb);

  v_title   := nullif(btrim(ex->>'title'), '');
  v_date    := nullif(btrim(ex->>'date'), '');
  v_start_t := nullif(btrim(ex->>'start_time'), '');
  v_end_t   := nullif(btrim(ex->>'end_time'), '');

  if v_title is null or v_date is null then
    raise exception 'promote_candidate: title oder date fehlt';
  end if;

  -- Datum + Uhrzeit als Europe/Berlin-Lokalzeit interpretieren → timestamptz.
  v_start := (v_date || ' ' || coalesce(v_start_t, '00:00'))::timestamp at time zone 'Europe/Berlin';
  if v_end_t is not null then
    v_end := (v_date || ' ' || v_end_t)::timestamp at time zone 'Europe/Berlin';
    -- Über Mitternacht NUR, wenn echte Startzeit vorliegt und Ende davor liegt.
    -- Folgetag als Wand-Uhrzeit neu interpretieren (DST-sicher, nicht +interval).
    if v_start_t is not null and v_end <= v_start then
      v_end := ((v_date::date + 1)::text || ' ' || v_end_t)::timestamp at time zone 'Europe/Berlin';
    end if;
  end if;

  -- Venue: expliziter Override > Fuzzy-Match auf location_name.
  v_venue := coalesce(
    nullif(ex->>'venue_id', '')::uuid,
    match_venue(ex->>'location_name')
  );

  -- Kategorie per slug.
  select id into v_category from categories where slug = nullif(btrim(ex->>'category'), '');

  -- Preis grob ableiten.
  v_price_type := case
    when lower(coalesce(ex->>'price', '')) ~ '(free|frei|kostenlos|gratis|umsonst)' then 'free'::price_type
    when nullif(btrim(ex->>'price'), '') is null then 'unknown'::price_type
    else 'paid'::price_type
  end;
  -- price_min nur bei 'paid'. Deutsche Schreibweise: '.' = Tausender entfernen,
  -- ',' = Dezimal → '.'. Parsen exception-sicher + numeric(8,2)-Overflow kappen,
  -- damit ein krummer Preistext nie den ganzen Promote abbricht.
  v_price_min := null;
  if v_price_type = 'paid' then
    begin
      v_price_min := nullif(
        replace(replace(substring(coalesce(ex->>'price', '') from '[0-9][0-9.,]*'), '.', ''), ',', '.'),
        ''
      )::numeric;
      if v_price_min is not null and (v_price_min < 0 or v_price_min > 999999.99) then
        v_price_min := null;
      end if;
    exception when others then
      v_price_min := null;
    end;
  end if;

  insert into events (
    title, description, status,
    start_at, end_at,
    venue_id, address_override, category_id,
    music_genre, vibe_tags,
    price_type, price_min, currency,
    age_restriction,
    ticket_url, external_url,
    source_id, source_url
  ) values (
    v_title,
    nullif(btrim(ex->>'description'), ''),
    'pending_review',
    v_start, v_end,
    v_venue, nullif(btrim(ex->>'address'), ''), v_category,
    nullif(btrim(ex->>'music_genre'), ''),
    coalesce(
      (select array_agg(t)
         from jsonb_array_elements_text(
           case when jsonb_typeof(ex->'vibe_tags') = 'array' then ex->'vibe_tags' else '[]'::jsonb end
         ) as t),
      '{}'::text[]
    ),
    v_price_type, v_price_min, 'EUR',
    nullif(regexp_replace(coalesce(ex->>'age_restriction', ''), '[^0-9]', '', 'g'), '')::int,
    -- Nur http(s)-URLs zulassen (kein javascript:/data: in die App).
    case when ex->>'ticket_url' ~* '^https?://' then btrim(ex->>'ticket_url') end,
    case when ex->>'source_url' ~* '^https?://' then btrim(ex->>'source_url') end,
    c.source_id,
    case when ex->>'source_url' ~* '^https?://' then btrim(ex->>'source_url') end
  )
  returning id into v_new_id;

  update imported_event_candidates
  set status            = 'approved',
      promoted_event_id = v_new_id,
      reviewed_by       = auth.uid(),
      reviewed_at       = now()
  where id = in_candidate_id;

  return v_new_id;
end;
$$;

-- Index für die Kandidaten-Liste je Quelle.
create index if not exists candidates_source_idx on imported_event_candidates (source_id);

grant execute on function match_venue(text)                                  to authenticated, service_role;
grant execute on function find_duplicate_events(text, timestamptz, interval) to authenticated, service_role;
grant execute on function promote_candidate(uuid, jsonb)                     to authenticated, service_role;
