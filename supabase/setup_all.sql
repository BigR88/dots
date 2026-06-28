-- ============================================================================
-- dots — Komplettes Datenbank-Setup (einmalig im Supabase SQL-Editor ausführen)
-- Reihenfolge: Schema → RLS/RPCs → Social-Layer → Seed-Daten
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- >>> migrations/0001_schema.sql
-- ────────────────────────────────────────────────────────────────────────────
-- dots — Initiales Schema (Blueprint §5)
-- PostgreSQL + PostGIS. Konventionen: uuid-PK, timestamptz, enums, geography(Point,4326).

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ── Enums ───────────────────────────────────────────────────────────────────
create type event_status      as enum ('draft','pending_review','published','archived','rejected');
create type price_type        as enum ('free','paid','donation','unknown');
create type candidate_status  as enum ('pending','approved','rejected','duplicate');
create type source_type       as enum ('official_api','website','newsletter','instagram_link','manual','partner_submission');
create type user_role         as enum ('user','editor','admin');

-- ── updated_at-Trigger-Helper ───────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── categories ──────────────────────────────────────────────────────────────
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  icon        text,
  color       text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── venues ──────────────────────────────────────────────────────────────────
create table venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  city        text not null default 'Frankfurt am Main',
  postal_code text,
  location    geography(Point, 4326),
  description text,
  website_url text,
  instagram   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index venues_location_gix on venues using gist (location);
create index venues_name_trgm on venues using gin (name gin_trgm_ops);
create trigger venues_set_updated_at before update on venues
  for each row execute function set_updated_at();

-- ── organizers ──────────────────────────────────────────────────────────────
create table organizers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  instagram     text,
  website_url   text,
  contact_email text,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── event_sources ───────────────────────────────────────────────────────────
create table event_sources (
  id           uuid primary key default gen_random_uuid(),
  type         source_type not null,
  name         text,
  url          text,
  organizer_id uuid references organizers(id) on delete set null,
  is_trusted   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── events (Kerntabelle) ────────────────────────────────────────────────────
create table events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        event_status not null default 'draft',

  start_at      timestamptz not null,
  end_at        timestamptz,
  doors_at      timestamptz,

  venue_id      uuid references venues(id) on delete set null,
  location      geography(Point,4326),
  address_override text,

  category_id   uuid references categories(id) on delete set null,
  music_genre   text,
  vibe_tags     text[] default '{}',

  price_type    price_type not null default 'unknown',
  price_min     numeric(8,2),
  price_max     numeric(8,2),
  currency      text not null default 'EUR',
  age_restriction int,

  cover_image_path text,
  ticket_url    text,
  external_url  text,

  organizer_id  uuid references organizers(id) on delete set null,
  source_id     uuid references event_sources(id) on delete set null,
  source_url    text,

  popularity_score numeric not null default 0,
  favorites_count  int not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index events_start_at_idx on events (start_at);
create index events_status_idx   on events (status);
create index events_category_idx on events (category_id);
create index events_location_gix on events using gist (location);
create index events_title_trgm   on events using gin (title gin_trgm_ops);
create trigger events_set_updated_at before update on events
  for each row execute function set_updated_at();

-- Geo-Denormalisierung: events.location aus venue übernehmen, wenn nicht gesetzt.
create or replace function sync_event_location() returns trigger
language plpgsql as $$
begin
  if new.location is null and new.venue_id is not null then
    select v.location into new.location from venues v where v.id = new.venue_id;
  end if;
  return new;
end;
$$;
create trigger events_sync_location before insert or update of venue_id, location on events
  for each row execute function sync_event_location();

-- ── profiles + Rollen-Helper ────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  role          user_role not null default 'user',
  home_location geography(Point,4326),
  created_at    timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin','editor')
  );
$$;

-- ── favorites ───────────────────────────────────────────────────────────────
create table favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index favorites_event_idx on favorites (event_id);

-- ── imported_event_candidates (KI-Review-Queue, §6) ─────────────────────────
create table imported_event_candidates (
  id               uuid primary key default gen_random_uuid(),
  source_id        uuid references event_sources(id) on delete set null,
  status           candidate_status not null default 'pending',

  raw_input        text,
  raw_image_path   text,
  extracted        jsonb not null,
  confidence_score numeric not null default 0,

  possible_duplicate_of uuid references events(id) on delete set null,
  missing_fields   text[] default '{}',
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,
  promoted_event_id uuid references events(id) on delete set null,

  created_at       timestamptz not null default now()
);
create index candidates_status_idx on imported_event_candidates (status);
create index candidates_conf_idx   on imported_event_candidates (confidence_score);

-- ── reports (optional, später) ──────────────────────────────────────────────
create table reports (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null,
  details     text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- >>> migrations/0002_rls_rpc.sql
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- >>> migrations/0003_social.sql
-- ────────────────────────────────────────────────────────────────────────────
-- dots — Social-Layer: Freundschaften, Chat, Event-Zusagen, Trend-Ranking.
-- Baut auf 0001 (profiles, events) und 0002 (RLS-Basis) auf.

-- ── Enums ───────────────────────────────────────────────────────────────────
create type friendship_status as enum ('pending', 'accepted', 'blocked');

-- ── friendships ─────────────────────────────────────────────────────────────
-- Eine Zeile pro Freundschaft; requester stellt die Anfrage, addressee nimmt an.
create table friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- Pro Personenpaar nur eine Freundschaft, egal wer angefragt hat.
create unique index friendships_pair_uniq
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on friendships (addressee_id, status);

-- Helper: sind zwei Nutzer (angenommen) befreundet?
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ── messages (1:1-Chat) ─────────────────────────────────────────────────────
create table messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_thread_idx on messages (sender_id, recipient_id, created_at);
create index messages_recipient_idx on messages (recipient_id, read_at);

-- ── event_attendance ("Bin dabei") ──────────────────────────────────────────
create table event_attendance (
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendance_user_idx on event_attendance (user_id, created_at);

-- ── event_clicks (Detail-Aufrufe für das Trend-Signal) ──────────────────────
create table event_clicks (
  id          bigint generated always as identity primary key,
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null, -- anonym erlaubt
  created_at  timestamptz not null default now()
);
create index event_clicks_event_idx on event_clicks (event_id, created_at);

-- ── Trend-Ranking ───────────────────────────────────────────────────────────
-- Zusagen zählen stark, Klicks schwach; nur die letzten 7 Tage fließen ein.
create or replace view event_trending as
select
  e.id as event_id,
  coalesce(att.cnt, 0)                          as attendees,
  coalesce(clk.cnt, 0)                          as clicks_7d,
  coalesce(att.cnt, 0) * 5 + coalesce(clk.cnt, 0) as trend_score
from events e
left join lateral (
  select count(*) as cnt from event_attendance a where a.event_id = e.id
) att on true
left join lateral (
  select count(*) as cnt from event_clicks c
  where c.event_id = e.id and c.created_at > now() - interval '7 days'
) clk on true
where e.status = 'published';

-- Aggregierte Zähler öffentlich abrufbar (ohne Namen) — für Cards & Ranking.
create or replace function event_attendee_counts(event_ids uuid[])
returns table (event_id uuid, attendees bigint)
language sql stable security definer set search_path = public as $$
  select a.event_id, count(*)::bigint
  from event_attendance a
  where a.event_id = any (event_ids)
  group by a.event_id;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table friendships      enable row level security;
alter table messages         enable row level security;
alter table event_attendance enable row level security;
alter table event_clicks     enable row level security;

-- friendships: nur Beteiligte sehen/ändern sie.
create policy friendships_select on friendships for select
  using (auth.uid() in (requester_id, addressee_id));
create policy friendships_insert on friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');
create policy friendships_respond on friendships for update
  using (auth.uid() = addressee_id)            -- nur der Empfänger nimmt an/blockt
  with check (status in ('accepted', 'blocked'));
create policy friendships_delete on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- messages: nur Sender/Empfänger lesen; senden nur an angenommene Freunde.
create policy messages_select on messages for select
  using (auth.uid() in (sender_id, recipient_id));
create policy messages_insert on messages for insert
  with check (auth.uid() = sender_id and are_friends(sender_id, recipient_id));
create policy messages_mark_read on messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- event_attendance: eigene Zusage verwalten; sichtbar sind eigene + die von
-- Freunden (Zähler laufen über event_attendee_counts, ohne Namen).
create policy attendance_select on event_attendance for select
  using (auth.uid() = user_id or are_friends(auth.uid(), user_id));
create policy attendance_insert on event_attendance for insert
  with check (auth.uid() = user_id);
create policy attendance_delete on event_attendance for delete
  using (auth.uid() = user_id);

-- event_clicks: jeder darf Klicks loggen (auch anonym), niemand liest roh.
create policy clicks_insert on event_clicks for insert
  with check (user_id is null or user_id = auth.uid());

-- Realtime für den Chat (in Supabase: Publication ergänzen).
alter publication supabase_realtime add table messages;

-- ────────────────────────────────────────────────────────────────────────────
-- >>> seed.sql
-- ────────────────────────────────────────────────────────────────────────────
-- dots — Seed: kuratierte Frankfurt-Events (Blueprint §10.3 Kaltstart).
-- Daten relativ zu Launch-Bezug 2026-06-11 (Do). Wochenende = 13./14.06.
-- Idempotent: erst leeren, dann neu einspielen.

truncate table favorites, imported_event_candidates, reports, events,
  event_sources, organizers, venues, categories restart identity cascade;

-- ── Kategorien (slugs == packages/shared/categories.ts) ──────────────────────
insert into categories (slug, name, icon, color, sort_order) values
  ('day_drinking',  'Day Drinking',   'sunny',          '#F6A609', 1),
  ('clubbing',      'Clubbing',       'musical-notes',  '#6C5CE7', 2),
  ('bars',          'Bars',           'wine',           '#E84393', 3),
  ('open_air',      'Open Air',       'leaf',           '#00B894', 4),
  ('student_party', 'Studentenparty', 'school',         '#0984E3', 5),
  ('rooftop',       'Rooftop',        'business',       '#E17055', 6),
  ('live_music',    'Live Music',     'mic',            '#D63031', 7),
  ('culture',       'Kultur',         'color-palette',  '#A29BFE', 8);

-- ── Venues (echte Frankfurter Locations, Koordinaten lon/lat) ───────────────
insert into venues (name, address, postal_code, location, instagram) values
  ('Tanzhaus West',        'Gutleutstraße 294',     '60327', st_makepoint(8.6228, 50.1006)::geography, 'tanzhauswest'),
  ('Robert Johnson',       'Nordring 131, Offenbach','63067', st_makepoint(8.7561, 50.1066)::geography, 'robertjohnsonclub'),
  ('Gibson Club',          'Zeil 85-93',            '60313', st_makepoint(8.6840, 50.1148)::geography, 'gibsonclub'),
  ('Silbergold',           'Hanauer Landstraße 6',  '60314', st_makepoint(8.6995, 50.1112)::geography, 'silbergoldffm'),
  ('Zoom',                 'Brönnerstraße 5-9',     '60313', st_makepoint(8.6845, 50.1158)::geography, 'zoomfrankfurt'),
  ('Batschkapp',           'Gwinnerstraße 5',       '60388', st_makepoint(8.7390, 50.1612)::geography, 'batschkapp'),
  ('Yachtklub',            'Mayfarthstraße 4',      '60314', st_makepoint(8.7035, 50.1118)::geography, 'yachtklub.ffm'),
  ('MainNizza',            'Untermainkai 17',       '60329', st_makepoint(8.6735, 50.1075)::geography, 'mainnizza'),
  ('City Beach Frankfurt', 'Hasengasse 5-7',        '60311', st_makepoint(8.6818, 50.1138)::geography, 'citybeachfrankfurt'),
  ('Frankfurter Botschaft','Westhafenplatz 6-8',    '60327', st_makepoint(8.6505, 50.1028)::geography, 'frankfurter_botschaft'),
  ('Orange Peel',          'Kleine Rittergasse 17', '60594', st_makepoint(8.6862, 50.1042)::geography, 'orangepeelffm'),
  ('Das Bett',             'Schmidtstraße 12',      '60326', st_makepoint(8.6320, 50.1012)::geography, 'dasbett'),
  ('Südbahnhof',           'Hedderichstraße 51',    '60594', st_makepoint(8.6855, 50.0995)::geography, 'suedbahnhof'),
  ('Studierendenhaus Bockenheim','Mertonstraße 26', '60325', st_makepoint(8.6510, 50.1245)::geography, null),
  ('Lavaña Rooftop',       'Junghofstraße 16',      '60311', st_makepoint(8.6760, 50.1145)::geography, 'lavana.ffm');

-- ── Organizers ──────────────────────────────────────────────────────────────
insert into organizers (name, instagram, is_verified) values
  ('Tanzhaus West Booking', 'tanzhauswest',  true),
  ('Robert Johnson',        'robertjohnsonclub', true),
  ('Goethe-Uni AStA',       'asta_goetheuni', false),
  ('Main Rooftop Collective','mainrooftop',  false),
  ('FFM Open Air Crew',     'ffmopenair',    false);

-- ── Event-Quelle (manuell kuratiert) ────────────────────────────────────────
insert into event_sources (type, name, is_trusted) values
  ('manual', 'Redaktion (Kaltstart-Kuratierung)', true);

-- ── Helper-Notation: venue/category/organizer/source per Subselect ──────────
-- start_at in Europe/Berlin (CEST, +02:00).

insert into events
  (title, description, status, start_at, end_at, venue_id, category_id, organizer_id, source_id,
   music_genre, vibe_tags, price_type, price_min, price_max, age_restriction, ticket_url, external_url, popularity_score)
values
-- ── HEUTE (2026-06-11) ──────────────────────────────────────────────────────
('Afterwork Rooftop Sundowner',
 'Feierabend mit Aperol, House-DJ und Skyline-Blick über dem Main.',
 'published', '2026-06-11T18:00:00+02', '2026-06-11T23:00:00+02',
 (select id from venues where name='MainNizza'), (select id from categories where slug='rooftop'),
 (select id from organizers where name='Main Rooftop Collective'), (select id from event_sources limit 1),
 'House', '{rooftop,afterwork,sundowner}', 'free', null, null, 18, null, 'https://mainnizza.de', 42),

('Techno Thursday',
 'Mitten in der Woche durchtanzen: tiefer Techno auf zwei Floors.',
 'published', '2026-06-11T23:00:00+02', '2026-06-12T06:00:00+02',
 (select id from venues where name='Tanzhaus West'), (select id from categories where slug='clubbing'),
 (select id from organizers where name='Tanzhaus West Booking'), (select id from event_sources limit 1),
 'Techno', '{techno,club,latenight}', 'paid', 15, 18, 18, 'https://tanzhauswest.com/tickets', null, 88),

('Wine & Vinyl',
 'Naturwein und Soul-Platten in entspannter Bar-Atmosphäre.',
 'published', '2026-06-11T19:30:00+02', '2026-06-12T01:00:00+02',
 (select id from venues where name='Orange Peel'), (select id from categories where slug='bars'),
 null, (select id from event_sources limit 1),
 'Soul', '{wine,vinyl,cozy}', 'free', null, null, 18, null, null, 19),

('Open Stage Live Session',
 'Lokale Bands und Singer-Songwriter live — Eintritt frei, Hut geht rum.',
 'published', '2026-06-11T20:00:00+02', '2026-06-11T23:30:00+02',
 (select id from venues where name='Südbahnhof'), (select id from categories where slug='live_music'),
 null, (select id from event_sources limit 1),
 'Indie', '{livemusic,local,openstage}', 'donation', null, null, null, null, null, 25),

-- ── MORGEN (2026-06-12, Fr) ─────────────────────────────────────────────────
('Friday Night Fever',
 'Disco, Funk & House — der Klassiker zum Wochenendstart.',
 'published', '2026-06-12T23:00:00+02', '2026-06-13T05:00:00+02',
 (select id from venues where name='Gibson Club'), (select id from categories where slug='clubbing'),
 null, (select id from event_sources limit 1),
 'Disco House', '{disco,funk,party}', 'paid', 12, 15, 18, 'https://gibson-club.de', null, 71),

('Rooftop Sunset Sessions',
 'Sonnenuntergang, Cocktails und melodische Beats über den Dächern.',
 'published', '2026-06-12T18:30:00+02', '2026-06-13T00:00:00+02',
 (select id from venues where name='Lavaña Rooftop'), (select id from categories where slug='rooftop'),
 (select id from organizers where name='Main Rooftop Collective'), (select id from event_sources limit 1),
 'Melodic House', '{rooftop,sunset,cocktails}', 'paid', 10, null, 21, null, 'https://lavana.de', 54),

('Indie Disco',
 'Von Arctic Monkeys bis The Strokes — Gitarren statt Bassdrops.',
 'published', '2026-06-12T22:00:00+02', '2026-06-13T04:00:00+02',
 (select id from venues where name='Das Bett'), (select id from categories where slug='clubbing'),
 null, (select id from event_sources limit 1),
 'Indie', '{indie,disco,guitars}', 'paid', 8, 10, 18, 'https://das-bett.de', null, 38),

('Karaoke & Cocktails',
 'Bühne frei: Karaoke-Nacht mit 2-für-1 Cocktails bis 22 Uhr.',
 'published', '2026-06-12T20:00:00+02', '2026-06-13T01:00:00+02',
 (select id from venues where name='Orange Peel'), (select id from categories where slug='bars'),
 null, (select id from event_sources limit 1),
 null, '{karaoke,cocktails,fun}', 'free', null, null, 18, null, null, 22),

-- ── WOCHENENDE (2026-06-13 Sa) ──────────────────────────────────────────────
('Day Drinking am Main',
 'Open-Air Day-Party am Mainufer: Spritz, Sonne, sanfte House-Beats ab mittags.',
 'published', '2026-06-13T13:00:00+02', '2026-06-13T22:00:00+02',
 (select id from venues where name='Yachtklub'), (select id from categories where slug='day_drinking'),
 (select id from organizers where name='FFM Open Air Crew'), (select id from event_sources limit 1),
 'House', '{daydrinking,openair,riverside}', 'paid', 5, null, 18, 'https://yachtklub.de', null, 95),

('Robert Johnson presents: Minimal Night',
 'Reduzierter Minimal-Techno im legendären Offenbacher Club.',
 'published', '2026-06-13T23:59:00+02', '2026-06-14T08:00:00+02',
 (select id from venues where name='Robert Johnson'), (select id from categories where slug='clubbing'),
 (select id from organizers where name='Robert Johnson'), (select id from event_sources limit 1),
 'Minimal', '{minimal,techno,legendary}', 'paid', 18, 20, 18, 'https://robert-johnson.de', null, 99),

('City Beach Open Air',
 'Sand unter den Füßen, Cocktails in der Hand — Beach-Party mitten in der City.',
 'published', '2026-06-13T15:00:00+02', '2026-06-14T01:00:00+02',
 (select id from venues where name='City Beach Frankfurt'), (select id from categories where slug='open_air'),
 (select id from organizers where name='FFM Open Air Crew'), (select id from event_sources limit 1),
 'Beach House', '{beach,openair,cocktails}', 'free', null, null, 18, null, 'https://citybeach-frankfurt.de', 67),

('Hip-Hop & RnB Saturday',
 'Die größten Hip-Hop- und RnB-Anthems auf der Zeil.',
 'published', '2026-06-13T23:00:00+02', '2026-06-14T05:00:00+02',
 (select id from venues where name='Zoom'), (select id from categories where slug='clubbing'),
 null, (select id from event_sources limit 1),
 'Hip-Hop', '{hiphop,rnb,party}', 'paid', 12, 14, 18, 'https://zoomfrankfurt.com', null, 76),

('Live: Indie Rock Doublebill',
 'Zwei aufstrebende Indie-Rock-Acts an einem Abend.',
 'published', '2026-06-13T20:00:00+02', '2026-06-14T00:00:00+02',
 (select id from venues where name='Batschkapp'), (select id from categories where slug='live_music'),
 null, (select id from event_sources limit 1),
 'Indie Rock', '{livemusic,concert,indie}', 'paid', 22, 26, null, 'https://batschkapp.de', null, 48),

('Warehouse Rave',
 'Harter, schneller Sound in der Industriehalle — bis die Sonne aufgeht.',
 'published', '2026-06-13T23:30:00+02', '2026-06-14T07:00:00+02',
 (select id from venues where name='Silbergold'), (select id from categories where slug='clubbing'),
 null, (select id from event_sources limit 1),
 'Hard Techno', '{rave,warehouse,hardtechno}', 'paid', 14, 16, 18, 'https://silbergold-frankfurt.de', null, 81),

('Westhafen Boat Party',
 'Schwimmende Tanzfläche am Westhafen mit Blick aufs Wasser.',
 'published', '2026-06-13T16:00:00+02', '2026-06-13T23:00:00+02',
 (select id from venues where name='Frankfurter Botschaft'), (select id from categories where slug='day_drinking'),
 (select id from organizers where name='Main Rooftop Collective'), (select id from event_sources limit 1),
 'Deep House', '{boat,daydrinking,water}', 'paid', 15, null, 21, 'https://frankfurter-botschaft.com', null, 59),

-- ── WOCHENENDE (2026-06-14 So) ──────────────────────────────────────────────
('Sunday Rooftop Brunch Beats',
 'Entspannter Sonntag mit Brunch, Lounge-Sound und Skyline.',
 'published', '2026-06-14T12:00:00+02', '2026-06-14T18:00:00+02',
 (select id from venues where name='Lavaña Rooftop'), (select id from categories where slug='rooftop'),
 (select id from organizers where name='Main Rooftop Collective'), (select id from event_sources limit 1),
 'Lounge', '{brunch,rooftop,chill}', 'paid', 20, null, null, null, 'https://lavana.de', 33),

('Open Air Closing',
 'Letzte Sonnenstrahlen, lange Sets — das Wochenende sanft ausklingen lassen.',
 'published', '2026-06-14T14:00:00+02', '2026-06-14T22:00:00+02',
 (select id from venues where name='Yachtklub'), (select id from categories where slug='open_air'),
 (select id from organizers where name='FFM Open Air Crew'), (select id from event_sources limit 1),
 'Melodic Techno', '{openair,closing,sunset}', 'free', null, null, 18, null, null, 44),

('Jazz Sunday',
 'Live-Jazz-Quartett bei Kerzenschein und gutem Wein.',
 'published', '2026-06-14T19:00:00+02', '2026-06-14T22:30:00+02',
 (select id from venues where name='Südbahnhof'), (select id from categories where slug='live_music'),
 null, (select id from event_sources limit 1),
 'Jazz', '{jazz,livemusic,cozy}', 'paid', 10, 12, null, null, null, 21),

-- ── KOMMENDE WOCHE / TRENDING (höhere popularity_score) ─────────────────────
('Semester Opening Party',
 'Die größte Studentenparty der Stadt — 3 Floors, 1 € Shots bis Mitternacht.',
 'published', '2026-06-18T22:00:00+02', '2026-06-19T05:00:00+02',
 (select id from venues where name='Studierendenhaus Bockenheim'), (select id from categories where slug='student_party'),
 (select id from organizers where name='Goethe-Uni AStA'), (select id from event_sources limit 1),
 'Charts', '{student,party,cheap}', 'paid', 5, 8, 18, 'https://asta-frankfurt.de', null, 92),

('Rooftop Full Moon Session',
 'Vollmond-Special über den Dächern: Live-Percussion trifft House-DJ.',
 'published', '2026-06-19T19:00:00+02', '2026-06-20T02:00:00+02',
 (select id from venues where name='MainNizza'), (select id from categories where slug='rooftop'),
 (select id from organizers where name='Main Rooftop Collective'), (select id from event_sources limit 1),
 'House', '{rooftop,fullmoon,percussion}', 'paid', 12, null, 21, null, 'https://mainnizza.de', 64),

('Großes Open Air Festival',
 'Tagesfestival am Mainufer mit fünf Acts, Foodtrucks und Sonnenschein.',
 'published', '2026-06-20T14:00:00+02', '2026-06-21T00:00:00+02',
 (select id from venues where name='City Beach Frankfurt'), (select id from categories where slug='open_air'),
 (select id from organizers where name='FFM Open Air Crew'), (select id from event_sources limit 1),
 'Electronic', '{festival,openair,daytime}', 'paid', 25, 35, 18, 'https://citybeach-frankfurt.de', null, 97),

('Underground Techno Showcase',
 'Internationale Gäste, dunkler Sound, kein Dresscode außer gute Laune.',
 'published', '2026-06-20T23:59:00+02', '2026-06-21T10:00:00+02',
 (select id from venues where name='Robert Johnson'), (select id from categories where slug='clubbing'),
 (select id from organizers where name='Robert Johnson'), (select id from event_sources limit 1),
 'Techno', '{techno,underground,international}', 'paid', 20, 25, 18, 'https://robert-johnson.de', null, 85),

('Craft Beer & BBQ Day',
 'Day-Drinking-Special: lokale Craft-Biere und Smoker-BBQ am Wasser.',
 'published', '2026-06-21T13:00:00+02', '2026-06-21T20:00:00+02',
 (select id from venues where name='Frankfurter Botschaft'), (select id from categories where slug='day_drinking'),
 null, (select id from event_sources limit 1),
 null, '{craftbeer,bbq,daydrinking}', 'free', null, null, 18, null, null, 51),

('Bar-Hopping Kickoff',
 'Geführte Bar-Tour durch Sachsenhausen — fünf Bars, ein Abend.',
 'published', '2026-06-19T20:00:00+02', '2026-06-20T01:00:00+02',
 (select id from venues where name='Orange Peel'), (select id from categories where slug='bars'),
 null, (select id from event_sources limit 1),
 null, '{barhopping,sachsenhausen,social}', 'paid', 18, null, 18, 'https://orangepeel.de', null, 36),

('Kultur & Klub: Ausstellung trifft DJ',
 'Kunstausstellung am frühen Abend, DJ-Set zur späten Stunde.',
 'published', '2026-06-19T18:00:00+02', '2026-06-20T03:00:00+02',
 (select id from venues where name='Silbergold'), (select id from categories where slug='culture'),
 null, (select id from event_sources limit 1),
 'Electronica', '{culture,art,club}', 'paid', 8, null, 18, null, null, 29);

-- ════════════════════════════════════════════════════════════════════════
-- 0004_friends.sql — Nutzersuche + Freundes-/Anfragen-Übersicht
-- ════════════════════════════════════════════════════════════════════════
-- dots — Freunde: Nutzersuche + Freundes-/Anfragen-Übersicht.
--
-- Beide Funktionen sind SECURITY DEFINER, damit die `profiles`-Tabelle NICHT
-- breit geöffnet werden muss (profiles_self_read bleibt: nur eigenes Profil).
-- Sie geben gezielt nur id + display_name zurück. Baut auf 0003_social.sql
-- (friendships, are_friends) auf. Aktionen (anfragen/annehmen/entfernen) laufen
-- direkt über die friendships-Policies aus 0003.

-- Nutzer:innen nach Anzeigenamen suchen (min. 2 Zeichen). Blendet sich selbst
-- und bereits verbundene/angefragte Personen aus.
create or replace function search_users(q text)
returns table (id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name
  from profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and char_length(btrim(q)) >= 2
    and p.display_name ilike '%' || btrim(q) || '%'
    and not exists (
      select 1 from friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p.id)
         or (f.addressee_id = auth.uid() and f.requester_id = p.id)
    )
  order by p.display_name
  limit 20;
$$;

-- Eigene Freundschaften (angenommen) + offene Anfragen, jeweils mit Name,
-- Richtung (friend/incoming/outgoing) und der friendship-ID für Aktionen.
create or replace function friend_overview()
returns table (
  friendship_id uuid,
  other_id      uuid,
  display_name  text,
  status        friendship_status,
  direction     text,
  created_at    timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as other_id,
    p.display_name,
    f.status,
    case
      when f.status = 'accepted'           then 'friend'
      when f.requester_id = auth.uid()     then 'outgoing'
      else 'incoming'
    end as direction,
    f.created_at
  from friendships f
  join profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
    and f.status in ('pending', 'accepted')
  order by f.status desc, p.display_name;
$$;

grant execute on function search_users(text)  to anon, authenticated;
grant execute on function friend_overview()   to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 0005_profile_usernames.sql — eindeutiger @username + Profilfelder
-- ════════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists username  text;
alter table profiles add column if not exists bio       text;
alter table profiles add column if not exists interests text[] not null default '{}';
alter table profiles add column if not exists home_area text;

with base as (
  select
    p.id,
    coalesce(
      nullif(regexp_replace(lower(coalesce(p.display_name, 'gast')), '[^a-z0-9._]', '', 'g'), ''),
      'dots'
    ) as raw
  from profiles p
  where p.username is null
),
numbered as (
  select id, raw, row_number() over (partition by raw order by id) as rn
  from base
)
update profiles p
set username = left(case when n.rn = 1 then n.raw else n.raw || n.rn::text end, 20)
from numbered n
where p.id = n.id;

update profiles
set username = left(username || 'user', 20)
where username is not null and char_length(username) < 3;

create unique index if not exists profiles_username_uniq on profiles (lower(username));

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9._]{3,20}$');

create or replace function username_available(candidate text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from profiles p
    where lower(p.username) = lower(btrim(candidate))
      and p.id <> auth.uid()
  );
$$;
grant execute on function username_available(text) to anon, authenticated;

drop function if exists search_users(text);
create or replace function search_users(q text)
returns table (id uuid, display_name text, username text)
language sql stable security definer set search_path = public as $$
  with needle as (select btrim(regexp_replace(q, '^@+', '')) as t)
  select p.id, p.display_name, p.username
  from profiles p, needle
  where auth.uid() is not null
    and p.id <> auth.uid()
    and char_length(needle.t) >= 2
    and (
      p.display_name ilike '%' || needle.t || '%'
      or p.username   ilike '%' || needle.t || '%'
    )
    and not exists (
      select 1 from friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p.id)
         or (f.addressee_id = auth.uid() and f.requester_id = p.id)
    )
  order by p.display_name
  limit 20;
$$;
grant execute on function search_users(text) to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- 0006_import_agent.sql — KI-Import-Agent (Matching + Promote-RPCs)
-- ════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════
-- 0007_event_ingestion.sql — Event Ingestion System (Phase 6+)
-- ════════════════════════════════════════════════════════════════════════

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
