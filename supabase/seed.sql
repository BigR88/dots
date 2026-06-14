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
