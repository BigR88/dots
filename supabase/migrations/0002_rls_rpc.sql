-- dots — RLS, RPCs, Wartungs-Jobs (Blueprint §5.12–5.14)

-- ── RLS aktivieren ──────────────────────────────────────────────────────────
alter table categories                enable row level security;
alter table venues                    enable row level security;
alter table organizers                enable row level security;
alter table event_sources             enable row level security;
alter table events                    enable row level security;
alter table profiles                  enable row level security;
alter table favorites                 enable row level security;
alter table imported_event_candidates enable row level security;
alter table reports                   enable row level security;

-- Öffentlich lesbare Stammdaten (für Filter/Pins/Detail).
create policy "categories_public_read" on categories for select using (is_active);
create policy "venues_public_read"     on venues     for select using (true);
create policy "organizers_public_read" on organizers for select using (true);

-- Events: öffentlich nur veröffentlichte; Redaktion/Admin alles.
create policy "events_public_read" on events
  for select using (status = 'published');
create policy "events_admin_all" on events
  for all using (is_admin()) with check (is_admin());

-- Stammdaten-Pflege nur Redaktion/Admin.
create policy "categories_admin_all" on categories for all using (is_admin()) with check (is_admin());
create policy "venues_admin_all"     on venues     for all using (is_admin()) with check (is_admin());
create policy "organizers_admin_all" on organizers for all using (is_admin()) with check (is_admin());
create policy "sources_admin_all"    on event_sources for all using (is_admin()) with check (is_admin());

-- Favoriten gehören dem Nutzer.
create policy "favorites_own" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Review-Queue nur Redaktion/Admin.
create policy "candidates_admin" on imported_event_candidates
  for all using (is_admin()) with check (is_admin());

-- Profile: jeder sein eigenes; Admin alle.
create policy "profiles_self_read"  on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_self_write" on profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

-- Reports: Nutzer dürfen melden; Admin sieht/verwaltet alles.
create policy "reports_insert" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports_admin"  on reports for all using (is_admin()) with check (is_admin());

-- ── RPC: Events in der Nähe (§5.13) ─────────────────────────────────────────
create or replace function events_near(
  in_lon double precision,
  in_lat double precision,
  in_radius_m int default 5000,
  in_from timestamptz default now(),
  in_to   timestamptz default now() + interval '1 day',
  in_category uuid default null
)
returns setof events
language sql stable as $$
  select e.*
  from events e
  where e.status = 'published'
    and e.start_at >= in_from
    and e.start_at <  in_to
    and (in_category is null or e.category_id = in_category)
    and (
      e.location is null
      or st_dwithin(e.location, st_makepoint(in_lon, in_lat)::geography, in_radius_m)
    )
  order by st_distance(e.location, st_makepoint(in_lon, in_lat)::geography) asc nulls last,
           e.start_at asc;
$$;

-- ── Auto-Archivierung abgelaufener Events (§5.14) ───────────────────────────
-- Per Supabase Scheduled Function / pg_cron aufzurufen.
create or replace function archive_past_events() returns void
language sql as $$
  update events
  set status = 'archived', updated_at = now()
  where status = 'published'
    and coalesce(end_at, start_at + interval '6 hours') < now();
$$;
