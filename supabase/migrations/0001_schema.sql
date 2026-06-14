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
