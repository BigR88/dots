-- dots — Event Ingestion System (Phase 6+, Erweiterung von 0006)
-- ADDITIV: ergänzt events/event_sources/imported_event_candidates um Ingestion-
-- Metadaten und legt event_ingestion_runs + event_uploads an. Es wird KEINE
-- bestehende Spalte umbenannt/entfernt → die Mobile-App (liest events via
-- select('*'), nur status='published') bleibt unberührt.
-- Manuell im Supabase SQL-Editor ausführen (re-runnbar / idempotent).

-- ── Enum-Werte ergänzen ─────────────────────────────────────────────────────
-- Hinweis: ADD VALUE darf NICHT im selben Skript VERWENDET werden, in dem es
-- angelegt wird. Wir referenzieren diese Werte nur zur Laufzeit (App), daher ok.
alter type event_status add value if not exists 'needs_review';
alter type event_status add value if not exists 'expired';

alter type source_type add value if not exists 'api';
alter type source_type add value if not exists 'rss';
alter type source_type add value if not exists 'ical';
alter type source_type add value if not exists 'instagram_manual';
alter type source_type add value if not exists 'organizer';

-- ── events: Ingestion-/Provenienz-Metadaten (additiv) ───────────────────────
alter table events add column if not exists venue_name             text;
alter table events add column if not exists short_description      text;
alter table events add column if not exists city                   text default 'Frankfurt am Main';
alter table events add column if not exists timezone               text default 'Europe/Berlin';
alter table events add column if not exists price_text             text;
alter table events add column if not exists image_url              text;
alter table events add column if not exists confidence_score       numeric;
alter table events add column if not exists raw_extracted_text     text;
alter table events add column if not exists source_kind            text;  -- website|api|instagram_upload|manual|email|organizer_portal
alter table events add column if not exists source_name            text;
alter table events add column if not exists source_last_checked_at timestamptz;
alter table events add column if not exists duplicate_of           uuid references events(id) on delete set null;
alter table events add column if not exists missing_fields         text[] default '{}';
alter table events add column if not exists warnings               text[] default '{}';

-- source_kind statt "source_type": Letzteres ist bereits ein Enum-TYP-Name.
alter table events drop constraint if exists events_source_kind_chk;
alter table events add constraint events_source_kind_chk check (
  source_kind is null or source_kind in
  ('website','api','instagram_upload','manual','email','organizer_portal')
);
create index if not exists events_duplicate_of_idx on events (duplicate_of);

-- ── event_sources: Steuerung & Status (additiv) ─────────────────────────────
alter table event_sources add column if not exists active          boolean not null default true;
alter table event_sources add column if not exists check_frequency text not null default 'manual'; -- manual|hourly|daily|weekly
alter table event_sources add column if not exists last_checked_at timestamptz;
alter table event_sources add column if not exists notes           text;
alter table event_sources add column if not exists updated_at      timestamptz not null default now();
drop trigger if exists event_sources_set_updated_at on event_sources;
create trigger event_sources_set_updated_at before update on event_sources
  for each row execute function set_updated_at();

-- ── imported_event_candidates: Provenienz + Warnungen (additiv) ─────────────
alter table imported_event_candidates add column if not exists source_kind text;
alter table imported_event_candidates add column if not exists source_name text;
alter table imported_event_candidates add column if not exists warnings    text[] default '{}';

-- ── event_ingestion_runs: ein Log je Quellen-Lauf ───────────────────────────
create table if not exists event_ingestion_runs (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid references event_sources(id) on delete set null,
  status               text not null default 'running',  -- running|success|failed
  started_at           timestamptz not null default now(),
  finished_at          timestamptz,
  logs                 text,
  found_events_count   int not null default 0,
  created_events_count int not null default 0,
  updated_events_count int not null default 0,
  error_message        text
);
create index if not exists ingestion_runs_source_idx on event_ingestion_runs (source_id, started_at desc);
alter table event_ingestion_runs enable row level security;
drop policy if exists "ingestion_runs_admin" on event_ingestion_runs;
create policy "ingestion_runs_admin" on event_ingestion_runs
  for all using (is_admin()) with check (is_admin());

-- ── event_uploads: hochgeladene Flyer/Screenshots + OCR/Extraktion ──────────
create table if not exists event_uploads (
  id               uuid primary key default gen_random_uuid(),
  file_url         text,          -- optional: privater Storage-Pfad (TODO Bucket)
  file_type        text,
  source_kind      text not null default 'instagram_upload',
  raw_ocr_text     text,
  extracted_json   jsonb,
  status           text not null default 'pending', -- pending|extracted|linked|failed
  candidate_id     uuid references imported_event_candidates(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists event_uploads_status_idx on event_uploads (status, created_at desc);
alter table event_uploads enable row level security;
drop policy if exists "event_uploads_admin" on event_uploads;
create policy "event_uploads_admin" on event_uploads
  for all using (is_admin()) with check (is_admin());

-- ── promote_candidate: neu auf das erweiterte Extraktions-Schema ────────────
-- extracted nutzt jetzt start_datetime/end_datetime (ISO, Europe/Berlin bereits
-- aufgelöst), venue_name, price_text, min_age, short_description. Overrides aus
-- dem Review-Formular werden gemerged. Schreibt zusätzlich die Provenienz-
-- /Konfidenz-Felder ins Event.
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

  v_title := nullif(btrim(ex->>'title'), '');
  if v_title is null then
    raise exception 'promote_candidate: title fehlt';
  end if;

  -- start_datetime/end_datetime sind ISO-Strings (Zeitzone bereits enthalten).
  begin
    v_start := nullif(btrim(ex->>'start_datetime'), '')::timestamptz;
  exception when others then v_start := null;
  end;
  if v_start is null then
    raise exception 'promote_candidate: start_datetime fehlt/ungültig';
  end if;
  begin
    v_end := nullif(btrim(ex->>'end_datetime'), '')::timestamptz;
  exception when others then v_end := null;
  end;
  if v_end is not null and v_end <= v_start then
    v_end := null; -- rückwärtiges/0-Intervall verwerfen
  end if;

  -- Venue: expliziter Override > Fuzzy-Match auf venue_name.
  v_venue := coalesce(nullif(ex->>'venue_id', '')::uuid, match_venue(ex->>'venue_name'));

  select id into v_category from categories where slug = nullif(btrim(ex->>'category'), '');

  -- Preis grob ableiten (aus price_text). Exception-sicher + numeric(8,2)-Cap.
  v_price_type := case
    when lower(coalesce(ex->>'price_text', '')) ~ '(free|frei|kostenlos|gratis|umsonst)' then 'free'::price_type
    when nullif(btrim(ex->>'price_text'), '') is null then 'unknown'::price_type
    else 'paid'::price_type
  end;
  -- price_min nur bei 'paid'. '.' = dt. Tausender NUR bei reinen 3er-Gruppen
  -- (1.500); sonst Dezimaltrenner belassen (EN '10.50'); ',' = dt. Dezimal.
  v_price_min := null;
  if v_price_type = 'paid' then
    begin
      v_price_min := (
        select case
          when s.v is null then null
          when position(',' in s.v) > 0 then replace(replace(s.v, '.', ''), ',', '.')::numeric
          when s.v ~ '^[0-9]{1,3}(\.[0-9]{3})+$' then replace(s.v, '.', '')::numeric
          else s.v::numeric
        end
        from (select substring(coalesce(ex->>'price_text', '') from '[0-9][0-9.,]*') as v) s
      );
      if v_price_min is not null and (v_price_min < 0 or v_price_min > 999999.99) then
        v_price_min := null;
      end if;
    exception when others then v_price_min := null;
    end;
  end if;

  insert into events (
    title, description, short_description, status,
    start_at, end_at, timezone,
    venue_id, venue_name, address_override, city,
    category_id, music_genre,
    price_type, price_min, price_text, currency,
    age_restriction,
    ticket_url, external_url,
    source_id, source_url, source_kind, source_name,
    raw_extracted_text, confidence_score
  ) values (
    v_title,
    nullif(btrim(ex->>'description'), ''),
    nullif(btrim(ex->>'short_description'), ''),
    'pending_review',
    v_start, v_end, coalesce(nullif(btrim(ex->>'timezone'), ''), 'Europe/Berlin'),
    v_venue, nullif(btrim(ex->>'venue_name'), ''), nullif(btrim(ex->>'address'), ''),
    coalesce(nullif(btrim(ex->>'city'), ''), 'Frankfurt am Main'),
    v_category, nullif(btrim(ex->>'music_genre'), ''),
    v_price_type, v_price_min, nullif(btrim(ex->>'price_text'), ''), 'EUR',
    substring(coalesce(ex->>'min_age', '') from '[0-9]+')::int,
    case when ex->>'ticket_url' ~* '^https?://' then btrim(ex->>'ticket_url') end,
    case when ex->>'source_url' ~* '^https?://' then btrim(ex->>'source_url') end,
    c.source_id,
    case when ex->>'source_url' ~* '^https?://' then btrim(ex->>'source_url') end,
    c.source_kind, c.source_name,
    c.raw_input, c.confidence_score
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

grant execute on function promote_candidate(uuid, jsonb) to authenticated, service_role;
