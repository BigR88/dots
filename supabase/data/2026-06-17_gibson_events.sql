-- dots — Echte Gibson-Events (Juni 2026)
-- Quelle: gibson-club.de / Instagram @gibsonclub_beach. Manuell kuratiert am 2026-06-17.
-- Ausführen: Supabase-Dashboard → SQL Editor → Run.
-- Idempotent: mehrfaches Ausführen legt nichts doppelt an.

-- ── 1) Neue Venue: „Gibson Beach Club" (Open-Air-Standort im Bankenviertel) ───
insert into venues (name, address, postal_code, location, website_url, instagram)
select 'Gibson Beach Club', 'Mainzer Landstraße 23', '60325',
       st_makepoint(8.6650, 50.1100)::geography,
       'https://gibson-club.de/beach-club/', 'gibsonclub_beach'
where not exists (select 1 from venues where name = 'Gibson Beach Club');

-- ── 2) Events ─────────────────────────────────────────────────────────────────

-- SOUND UP — Do 18.06.2026, Live-Band, freier Eintritt 22–23 Uhr
insert into events
  (title, description, status, start_at, end_at, venue_id, category_id,
   music_genre, vibe_tags, price_type, price_min, price_max, age_restriction,
   external_url, source_url, popularity_score)
select
  'SOUND UP',
  'Freier Eintritt von 22:00–23:00 Uhr. Band Showtime: 22:30 Uhr.',
  'published', '2026-06-18T22:00:00+02', '2026-06-19T03:00:00+02',
  (select id from venues where name = 'Gibson Club' limit 1),
  (select id from categories where slug = 'live_music' limit 1),
  null, '{live,band,club}', 'free', null, null, 18,
  'https://gibson-club.de', 'https://gibson-club.de', 40
where not exists (
  select 1 from events where title = 'SOUND UP' and start_at = '2026-06-18T22:00:00+02'
);

-- ICY — Fr 19.06.2026, Line-Up: Frizzo, Ema Koof, Le Alen, Abendkasse 15 €
insert into events
  (title, description, status, start_at, end_at, venue_id, category_id,
   music_genre, vibe_tags, price_type, price_min, price_max, age_restriction,
   external_url, source_url, popularity_score)
select
  'ICY',
  'Line-Up: Frizzo, Ema Koof, Le Alen. Abendkasse: 15 €.',
  'published', '2026-06-19T23:00:00+02', '2026-06-20T05:00:00+02',
  (select id from venues where name = 'Gibson Club' limit 1),
  (select id from categories where slug = 'clubbing' limit 1),
  null, '{club,dj,party}', 'paid', 15, null, 18,
  'https://gibson-club.de', 'https://gibson-club.de', 62
where not exists (
  select 1 from events where title = 'ICY' and start_at = '2026-06-19T23:00:00+02'
);

-- GIBSON LOVES OLEN — Sa 20.06.2026, Main Floor: OLEN_Ger // Trick-E, Abendkasse 18 €
insert into events
  (title, description, status, start_at, end_at, venue_id, category_id,
   music_genre, vibe_tags, price_type, price_min, price_max, age_restriction,
   external_url, source_url, popularity_score)
select
  'GIBSON LOVES OLEN',
  'Main Floor: OLEN_Ger // Trick-E. Abendkasse: 18 €.',
  'published', '2026-06-20T23:00:00+02', '2026-06-21T05:00:00+02',
  (select id from venues where name = 'Gibson Club' limit 1),
  (select id from categories where slug = 'clubbing' limit 1),
  null, '{club,houseparty,dj}', 'paid', 18, null, 18,
  'https://gibson-club.de', 'https://gibson-club.de', 70
where not exists (
  select 1 from events where title = 'GIBSON LOVES OLEN' and start_at = '2026-06-20T23:00:00+02'
);

-- WM DAYDRINKING @ Gibson Beach — Sa 20.06.2026, 15 Uhr, Deutschland-WM-Spiel
insert into events
  (title, description, status, start_at, end_at, venue_id, category_id,
   music_genre, vibe_tags, price_type, price_min, price_max, age_restriction,
   external_url, source_url, popularity_score)
select
  'MGUN+Friends WM Daydrinking',
  'Deutschland WM-Spiel am Gibson Beach. Line-Up: MGUN, OLEN_Ger. Abendkasse: TBA.',
  'published', '2026-06-20T15:00:00+02', '2026-06-20T22:00:00+02',
  (select id from venues where name = 'Gibson Beach Club' limit 1),
  (select id from categories where slug = 'day_drinking' limit 1),
  null, '{daydrinking,worldcup,openair,beach}', 'unknown', null, null, null,
  'https://gibson-club.de/beach-club/', 'https://gibson-club.de/beach-club/', 80
where not exists (
  select 1 from events where title = 'MGUN+Friends WM Daydrinking' and start_at = '2026-06-20T15:00:00+02'
);

-- ── 3) Kontrolle: zeigt die neu angelegten Events ─────────────────────────────
select title,
       to_char(start_at at time zone 'Europe/Berlin', 'Dy DD.MM HH24:MI') as wann,
       (select name from venues v where v.id = e.venue_id) as venue,
       price_type, price_min
from events e
where title in ('SOUND UP','ICY','GIBSON LOVES OLEN','MGUN+Friends WM Daydrinking')
order by start_at;
