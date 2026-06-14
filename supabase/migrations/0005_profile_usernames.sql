-- dots — Profil-Erweiterung: eindeutiger @username + persönliche Profilfelder.
--
-- Ergänzt die bestehende `profiles`-Tabelle (0001) um:
--   • username   – eindeutiger Handle (z. B. @yannik), getrennt vom Anzeigenamen
--   • bio        – kurze Selbstbeschreibung
--   • interests  – Lieblingskategorien/Vibes (category slugs)
--   • home_area  – Lieblings-Stadtteil/Bereich (frei wählbar, optional)
--
-- RLS bleibt unverändert: profiles_self_read/self_write/self_insert (0002) greifen
-- weiter — Nutzer:innen lesen/schreiben weiter nur ihr eigenes Profil. Die
-- Eindeutigkeits-Prüfung läuft über die SECURITY-DEFINER-Funktion
-- `username_available`, damit profiles NICHT breit lesbar gemacht werden muss.

-- ── Spalten ──────────────────────────────────────────────────────────────────
alter table profiles add column if not exists username  text;
alter table profiles add column if not exists bio       text;
alter table profiles add column if not exists interests text[] not null default '{}';
alter table profiles add column if not exists home_area text;

-- ── Backfill: bestehende Nutzer bekommen einen generierten, eindeutigen Handle ─
-- Basis = bereinigter display_name; bei Kollision wird eine laufende Nummer
-- angehängt. Erfüllt bereits die Format-/Längenregeln (3–20, a-z0-9._).
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
set username = left(
  case when n.rn = 1 then n.raw else n.raw || n.rn::text end,
  20
)
from numbered n
where p.id = n.id;

-- Sehr kurze Handles (<3) auffüllen, damit der CHECK unten greift.
update profiles
set username = left(username || 'user', 20)
where username is not null and char_length(username) < 3;

-- ── Eindeutigkeit (case-insensitive) + Format ───────────────────────────────
create unique index if not exists profiles_username_uniq on profiles (lower(username));

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9._]{3,20}$');

-- ── RPC: Ist ein Username noch frei? (eigenen ausgenommen) ───────────────────
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

-- ── Nutzersuche zusätzlich über @username (baut search_users aus 0004 aus) ────
-- Gibt jetzt auch den username zurück; Suche matcht Anzeigename ODER username.
-- Führendes @ wird ignoriert. Rückwärtskompatibel (display_name bleibt erhalten).
-- DROP nötig: der Rückgabetyp ändert sich (0004 gab nur id+display_name), und
-- CREATE OR REPLACE darf den Rückgabetyp nicht ändern (Fehler 42P13).
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
