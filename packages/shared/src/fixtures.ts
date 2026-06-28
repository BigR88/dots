import type { Category, DotsEvent, Venue } from './types';
import { CATEGORY_BY_SLUG } from './categories';

// Lokale Demo-Daten — spiegeln eine repräsentative Auswahl aus supabase/seed.sql,
// damit Liste + Detail ohne laufendes Backend funktionieren.

function cat(slug: string): Category {
  const d = CATEGORY_BY_SLUG[slug] ?? { name: 'Event', icon: 'ellipse', color: '#94A3B8' };
  return {
    id: slug,
    slug,
    name: d.name,
    icon: d.icon,
    color: d.color,
    sortOrder: 0,
    isActive: true,
  };
}

const VENUES: Record<string, Venue> = {
  tanzhaus: v('Tanzhaus West', 'Gutleutstraße 294', 8.6228, 50.1006),
  rj: v('Robert Johnson', 'Nordring 131, Offenbach', 8.7561, 50.1066),
  gibson: v('Gibson Club', 'Zeil 85-93', 8.684, 50.1148),
  silbergold: v('Silbergold', 'Hanauer Landstraße 6', 8.6995, 50.1112),
  zoom: v('Zoom', 'Brönnerstraße 5-9', 8.6845, 50.1158),
  batschkapp: v('Batschkapp', 'Gwinnerstraße 5', 8.739, 50.1612),
  yacht: v('Yachtklub', 'Mayfarthstraße 4', 8.7035, 50.1118),
  mainnizza: v('MainNizza', 'Untermainkai 17', 8.6735, 50.1075),
  citybeach: v('City Beach Frankfurt', 'Hasengasse 5-7', 8.6818, 50.1138),
  botschaft: v('Frankfurter Botschaft', 'Westhafenplatz 6-8', 8.6505, 50.1028),
  orangepeel: v('Orange Peel', 'Kleine Rittergasse 17', 8.6862, 50.1042),
  bett: v('Das Bett', 'Schmidtstraße 12', 8.632, 50.1012),
  suedbahnhof: v('Südbahnhof', 'Hedderichstraße 51', 8.6855, 50.0995),
  studihaus: v('Studierendenhaus Bockenheim', 'Mertonstraße 26', 8.651, 50.1245),
  lavana: v('Lavaña Rooftop', 'Junghofstraße 16', 8.676, 50.1145),
  fortuna: v('Fortuna Irgendwo', 'Schäfergasse 36-38', 8.6856, 50.1172),
  lokalbahnhof: v('Lokalbahnhof', 'Darmstädter Landstraße 14', 8.6864, 50.1019),
  maincafe: v('Maincafé', 'Schaumainkai 50', 8.6792, 50.1035),
  longisland: v('Long Island Beach Bar', 'Weseler Werft 5', 8.7008, 50.1083),
  kleinmarkthalle: v('Kleinmarkthalle', 'Hasengasse 5-7', 8.6849, 50.1129),
  festhalle: v('Festhalle', 'Ludwig-Erhard-Anlage 1', 8.6503, 50.1118),
  pulse: v('Pulse Club', 'Hanauer Landstraße 52', 8.7015, 50.1176),
  velvet: v('Velvet Rooftop', 'Eschersheimer Landstraße 14', 8.6802, 50.1205),
};

function v(name: string, address: string, lon: number, lat: number): Venue {
  return {
    id: name,
    name,
    address,
    city: 'Frankfurt am Main',
    postalCode: null,
    location: { lon, lat },
    description: null,
    websiteUrl: null,
    instagram: null,
  };
}

interface Seed {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  venue: keyof typeof VENUES;
  category: string;
  genre?: string;
  vibes: string[];
  price: DotsEvent['priceType'];
  min?: number;
  max?: number;
  age?: number;
  ticket?: string;
  external?: string;
  pop: number;
}

// CEST (+02:00). Bezug: 2026-06-11 (Do).
const SEED: Seed[] = [
  { id: 'e01', title: 'Afterwork Rooftop Sundowner', description: 'Feierabend mit Aperol, House-DJ und Skyline-Blick über dem Main.', start: '2026-06-11T18:00:00+02:00', end: '2026-06-11T23:00:00+02:00', venue: 'mainnizza', category: 'rooftop', genre: 'House', vibes: ['rooftop', 'afterwork', 'sundowner'], price: 'free', age: 18, external: 'https://mainnizza.de', pop: 42 },
  { id: 'e02', title: 'Techno Thursday', description: 'Mitten in der Woche durchtanzen: tiefer Techno auf zwei Floors.', start: '2026-06-11T23:00:00+02:00', end: '2026-06-12T06:00:00+02:00', venue: 'tanzhaus', category: 'clubbing', genre: 'Techno', vibes: ['techno', 'club', 'latenight'], price: 'paid', min: 15, max: 18, age: 18, ticket: 'https://tanzhauswest.com/tickets', pop: 88 },
  { id: 'e03', title: 'Wine & Vinyl', description: 'Naturwein und Soul-Platten in entspannter Bar-Atmosphäre.', start: '2026-06-11T19:30:00+02:00', end: '2026-06-12T01:00:00+02:00', venue: 'orangepeel', category: 'bars', genre: 'Soul', vibes: ['wine', 'vinyl', 'cozy'], price: 'free', age: 18, pop: 19 },
  { id: 'e04', title: 'Open Stage Live Session', description: 'Lokale Bands und Singer-Songwriter live — Eintritt frei, Hut geht rum.', start: '2026-06-11T20:00:00+02:00', end: '2026-06-11T23:30:00+02:00', venue: 'suedbahnhof', category: 'live_music', genre: 'Indie', vibes: ['livemusic', 'local', 'openstage'], price: 'donation', pop: 25 },

  { id: 'e05', title: 'Friday Night Fever', description: 'Disco, Funk & House — der Klassiker zum Wochenendstart.', start: '2026-06-12T23:00:00+02:00', end: '2026-06-13T05:00:00+02:00', venue: 'gibson', category: 'clubbing', genre: 'Disco House', vibes: ['disco', 'funk', 'party'], price: 'paid', min: 12, max: 15, age: 18, ticket: 'https://gibson-club.de', pop: 71 },
  { id: 'e06', title: 'Rooftop Sunset Sessions', description: 'Sonnenuntergang, Cocktails und melodische Beats über den Dächern.', start: '2026-06-12T18:30:00+02:00', end: '2026-06-13T00:00:00+02:00', venue: 'lavana', category: 'rooftop', genre: 'Melodic House', vibes: ['rooftop', 'sunset', 'cocktails'], price: 'paid', min: 10, age: 21, external: 'https://lavana.de', pop: 54 },
  { id: 'e07', title: 'Indie Disco', description: 'Von Arctic Monkeys bis The Strokes — Gitarren statt Bassdrops.', start: '2026-06-12T22:00:00+02:00', end: '2026-06-13T04:00:00+02:00', venue: 'bett', category: 'clubbing', genre: 'Indie', vibes: ['indie', 'disco', 'guitars'], price: 'paid', min: 8, max: 10, age: 18, ticket: 'https://das-bett.de', pop: 38 },
  { id: 'e08', title: 'Karaoke & Cocktails', description: 'Bühne frei: Karaoke-Nacht mit 2-für-1 Cocktails bis 22 Uhr.', start: '2026-06-12T20:00:00+02:00', end: '2026-06-13T01:00:00+02:00', venue: 'orangepeel', category: 'bars', vibes: ['karaoke', 'cocktails', 'fun'], price: 'free', age: 18, pop: 22 },

  { id: 'e09', title: 'Day Drinking am Main', description: 'Open-Air Day-Party am Mainufer: Spritz, Sonne, sanfte House-Beats ab mittags.', start: '2026-06-13T13:00:00+02:00', end: '2026-06-13T22:00:00+02:00', venue: 'yacht', category: 'day_drinking', genre: 'House', vibes: ['daydrinking', 'openair', 'riverside'], price: 'paid', min: 5, age: 18, ticket: 'https://yachtklub.de', pop: 95 },
  { id: 'e10', title: 'Robert Johnson: Minimal Night', description: 'Reduzierter Minimal-Techno im legendären Offenbacher Club.', start: '2026-06-13T23:59:00+02:00', end: '2026-06-14T08:00:00+02:00', venue: 'rj', category: 'clubbing', genre: 'Minimal', vibes: ['minimal', 'techno', 'legendary'], price: 'paid', min: 18, max: 20, age: 18, ticket: 'https://robert-johnson.de', pop: 99 },
  { id: 'e11', title: 'City Beach Open Air', description: 'Sand unter den Füßen, Cocktails in der Hand — Beach-Party mitten in der City.', start: '2026-06-13T15:00:00+02:00', end: '2026-06-14T01:00:00+02:00', venue: 'citybeach', category: 'open_air', genre: 'Beach House', vibes: ['beach', 'openair', 'cocktails'], price: 'free', age: 18, external: 'https://citybeach-frankfurt.de', pop: 67 },
  { id: 'e12', title: 'Hip-Hop & RnB Saturday', description: 'Die größten Hip-Hop- und RnB-Anthems auf der Zeil.', start: '2026-06-13T23:00:00+02:00', end: '2026-06-14T05:00:00+02:00', venue: 'zoom', category: 'clubbing', genre: 'Hip-Hop', vibes: ['hiphop', 'rnb', 'party'], price: 'paid', min: 12, max: 14, age: 18, ticket: 'https://zoomfrankfurt.com', pop: 76 },
  { id: 'e13', title: 'Live: Indie Rock Doublebill', description: 'Zwei aufstrebende Indie-Rock-Acts an einem Abend.', start: '2026-06-13T20:00:00+02:00', end: '2026-06-14T00:00:00+02:00', venue: 'batschkapp', category: 'live_music', genre: 'Indie Rock', vibes: ['livemusic', 'concert', 'indie'], price: 'paid', min: 22, max: 26, ticket: 'https://batschkapp.de', pop: 48 },
  { id: 'e14', title: 'Warehouse Rave', description: 'Harter, schneller Sound in der Industriehalle — bis die Sonne aufgeht.', start: '2026-06-13T23:30:00+02:00', end: '2026-06-14T07:00:00+02:00', venue: 'silbergold', category: 'clubbing', genre: 'Hard Techno', vibes: ['rave', 'warehouse', 'hardtechno'], price: 'paid', min: 14, max: 16, age: 18, external: 'https://silbergold-frankfurt.de', pop: 81 },

  { id: 'e15', title: 'Sunday Rooftop Brunch Beats', description: 'Entspannter Sonntag mit Brunch, Lounge-Sound und Skyline.', start: '2026-06-14T12:00:00+02:00', end: '2026-06-14T18:00:00+02:00', venue: 'lavana', category: 'rooftop', genre: 'Lounge', vibes: ['brunch', 'rooftop', 'chill'], price: 'paid', min: 20, external: 'https://lavana.de', pop: 33 },
  { id: 'e16', title: 'Jazz Sunday', description: 'Live-Jazz-Quartett bei Kerzenschein und gutem Wein.', start: '2026-06-14T19:00:00+02:00', end: '2026-06-14T22:30:00+02:00', venue: 'suedbahnhof', category: 'live_music', genre: 'Jazz', vibes: ['jazz', 'livemusic', 'cozy'], price: 'paid', min: 10, max: 12, pop: 21 },

  { id: 'e17', title: 'Semester Opening Party', description: 'Die größte Studentenparty der Stadt — 3 Floors, 1 € Shots bis Mitternacht.', start: '2026-06-18T22:00:00+02:00', end: '2026-06-19T05:00:00+02:00', venue: 'studihaus', category: 'student_party', genre: 'Charts', vibes: ['student', 'party', 'cheap'], price: 'paid', min: 5, max: 8, age: 18, ticket: 'https://asta-frankfurt.de', pop: 92 },
  { id: 'e18', title: 'Großes Open Air Festival', description: 'Tagesfestival am Mainufer mit fünf Acts, Foodtrucks und Sonnenschein.', start: '2026-06-20T14:00:00+02:00', end: '2026-06-21T00:00:00+02:00', venue: 'citybeach', category: 'open_air', genre: 'Electronic', vibes: ['festival', 'openair', 'daytime'], price: 'paid', min: 25, max: 35, age: 18, ticket: 'https://citybeach-frankfurt.de', pop: 97 },
  { id: 'e19', title: 'Craft Beer & BBQ Day', description: 'Day-Drinking-Special: lokale Craft-Biere und Smoker-BBQ am Wasser.', start: '2026-06-21T13:00:00+02:00', end: '2026-06-21T20:00:00+02:00', venue: 'botschaft', category: 'day_drinking', vibes: ['craftbeer', 'bbq', 'daydrinking'], price: 'free', age: 18, pop: 51 },
  { id: 'e20', title: 'Kultur & Klub: Ausstellung trifft DJ', description: 'Kunstausstellung am frühen Abend, DJ-Set zur späten Stunde.', start: '2026-06-19T18:00:00+02:00', end: '2026-06-20T03:00:00+02:00', venue: 'silbergold', category: 'culture', genre: 'Electronica', vibes: ['culture', 'art', 'club'], price: 'paid', min: 8, age: 18, pop: 29 },

  // ── „Heute" (= frühester Demo-Tag): lebendige Karte über ganz Frankfurt ──────
  { id: 'e21', title: 'Pulse — House Allnighter', description: 'Treibender House auf der Mainfloor bis in die Morgenstunden.', start: '2026-06-11T23:00:00+02:00', end: '2026-06-12T06:00:00+02:00', venue: 'gibson', category: 'clubbing', genre: 'House', vibes: ['Popular', 'House', 'Guestlist'], price: 'paid', min: 14, max: 16, age: 18, ticket: 'https://gibson-club.de', pop: 86 },
  { id: 'e22', title: 'Gibson Warm-Up Floor', description: 'Früher Floor mit Disco-House zum Reinkommen.', start: '2026-06-11T21:30:00+02:00', end: '2026-06-12T01:00:00+02:00', venue: 'gibson', category: 'clubbing', genre: 'Disco House', vibes: ['House', 'Warmup'], price: 'paid', min: 10, age: 18, pop: 41 },
  { id: 'e23', title: 'Tech House Terrace', description: 'Tech-House auf der Terrasse mit DJs aus der Stadt.', start: '2026-06-11T22:00:00+02:00', end: '2026-06-12T05:00:00+02:00', venue: 'tanzhaus', category: 'clubbing', genre: 'Tech House', vibes: ['House', 'Open Air'], price: 'paid', min: 13, max: 16, age: 18, ticket: 'https://tanzhauswest.com/tickets', pop: 59 },
  { id: 'e24', title: 'FORTUNA Indie Rave', description: 'Indie trifft Electro — schwitzige Tanznacht im Bahnhofsviertel.', start: '2026-06-11T23:00:00+02:00', end: '2026-06-12T05:00:00+02:00', venue: 'fortuna', category: 'clubbing', genre: 'Indie Electro', vibes: ['Popular', 'Indie'], price: 'paid', min: 8, max: 10, age: 18, external: 'https://fortuna-irgendwo.de', pop: 72 },
  { id: 'e25', title: 'Penthouse: Hip-Hop & RnB', description: 'Die größten Hip-Hop- und RnB-Anthems auf der Zeil.', start: '2026-06-11T23:00:00+02:00', end: '2026-06-12T05:00:00+02:00', venue: 'zoom', category: 'clubbing', genre: 'Hip-Hop', vibes: ['Hip-Hop', 'Guestlist'], price: 'paid', min: 12, max: 14, age: 18, ticket: 'https://zoomfrankfurt.com', pop: 78 },
  { id: 'e26', title: 'Negroni Hour', description: 'Aperitivo-Stimmung mit Negronis und Soul in Sachsenhausen.', start: '2026-06-11T19:00:00+02:00', end: '2026-06-12T00:00:00+02:00', venue: 'lokalbahnhof', category: 'bars', vibes: ['Cozy', 'Afterwork'], price: 'free', age: 18, pop: 34 },
  { id: 'e27', title: 'Spritz am Main', description: 'Aperol, House-Beats und Sonne direkt am Mainufer.', start: '2026-06-11T15:00:00+02:00', end: '2026-06-11T22:00:00+02:00', venue: 'maincafe', category: 'day_drinking', genre: 'House', vibes: ['Daydrink', 'Open Air', 'Riverside'], price: 'free', age: 18, pop: 64 },
  { id: 'e28', title: 'Beach Daydrink Session', description: 'Sand, Liegestühle und Beach-House am Wasser.', start: '2026-06-11T14:00:00+02:00', end: '2026-06-11T22:00:00+02:00', venue: 'longisland', category: 'day_drinking', genre: 'Beach House', vibes: ['Daydrink', 'Open Air'], price: 'paid', min: 5, age: 18, external: 'https://longisland-frankfurt.de', pop: 57 },
  { id: 'e29', title: 'Indie Rock Live Doublebill', description: 'Zwei aufstrebende Indie-Rock-Acts an einem Abend.', start: '2026-06-11T20:00:00+02:00', end: '2026-06-12T00:00:00+02:00', venue: 'batschkapp', category: 'live_music', genre: 'Indie Rock', vibes: ['Live', 'Popular'], price: 'paid', min: 18, max: 24, ticket: 'https://batschkapp.de', pop: 50 },
  { id: 'e30', title: 'Festhalle Sommer Open Air', description: 'Großes Sommer-Open-Air mit Headliner und Lichtshow.', start: '2026-06-11T18:00:00+02:00', end: '2026-06-11T23:30:00+02:00', venue: 'festhalle', category: 'special_event', genre: 'Pop', vibes: ['Special', 'Popular'], price: 'paid', min: 35, max: 59, age: 16, ticket: 'https://festhalle.de', pop: 96 },
  { id: 'e31', title: 'Open Air Sundowner', description: 'Melodische Beats zum Sonnenuntergang am City Beach.', start: '2026-06-11T17:00:00+02:00', end: '2026-06-11T23:00:00+02:00', venue: 'citybeach', category: 'open_air', genre: 'Melodic House', vibes: ['Open Air', 'Sunset'], price: 'free', age: 18, external: 'https://citybeach-frankfurt.de', pop: 67 },
  { id: 'e32', title: 'DOTS Summer Special', description: 'Kuratierte Late-Night-Session mit Gästen — nur mit Guestlist.', start: '2026-06-11T20:00:00+02:00', end: '2026-06-12T02:00:00+02:00', venue: 'citybeach', category: 'special_event', genre: 'Electronic', vibes: ['Special', 'Guestlist'], price: 'paid', min: 15, age: 18, pop: 81 },
  { id: 'e33', title: 'Street Food Social', description: 'Streetfood-Stände, Naturwein und Nachbarschaft in der Kleinmarkthalle.', start: '2026-06-11T17:00:00+02:00', end: '2026-06-11T22:00:00+02:00', venue: 'kleinmarkthalle', category: 'food_social', vibes: ['Food', 'Social'], price: 'free', pop: 45 },
  { id: 'e34', title: 'BBQ & Beats', description: 'Smoker-BBQ, kühle Drinks und entspannte House-Sounds am Westhafen.', start: '2026-06-11T16:00:00+02:00', end: '2026-06-11T22:00:00+02:00', venue: 'botschaft', category: 'food_social', genre: 'House', vibes: ['Food', 'Daydrink'], price: 'paid', min: 6, age: 18, pop: 53 },
  { id: 'e35', title: 'Rooftop Golden Hour', description: 'Sonnenuntergang, Cocktails und melodische Beats über den Dächern.', start: '2026-06-11T18:30:00+02:00', end: '2026-06-12T00:00:00+02:00', venue: 'lavana', category: 'rooftop', genre: 'Melodic House', vibes: ['Rooftop', 'Sunset', 'Cocktails'], price: 'paid', min: 12, age: 21, external: 'https://lavana.de', pop: 60 },
  { id: 'e36', title: 'Campus Warm-Up Party', description: 'Günstige Drinks, Charts und volle Tanzfläche zum Wochenstart.', start: '2026-06-11T21:00:00+02:00', end: '2026-06-12T03:00:00+02:00', venue: 'studihaus', category: 'student_party', genre: 'Charts', vibes: ['Students', 'cheap'], price: 'paid', min: 3, max: 5, age: 18, ticket: 'https://asta-frankfurt.de', pop: 73 },
];

/** Alle Demo-Venues (z. B. für Auswahllisten im Admin). */
export const FIXTURE_VENUES: Venue[] = Object.values(VENUES);

// Die Demo-Events sind fix auf den 11.–21. Juni datiert. Damit der Demo-Modus
// IMMER aktuelle Events zeigt (unabhängig vom heutigen Datum), verschieben wir
// alle Zeiten so, dass der früheste Demo-Tag auf „heute" fällt. Die relativen
// Abstände bleiben erhalten — gleiche Venue-Gruppen pro Tag → korrekte Pins.
const SEED_EARLIEST_MS = new Date('2026-06-11T00:00:00+02:00').getTime();
const SEED_SHIFT_MS = (() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() - SEED_EARLIEST_MS;
})();
const shiftSeedTime = (iso: string): string =>
  new Date(new Date(iso).getTime() + SEED_SHIFT_MS).toISOString();

const SEED_EVENTS: DotsEvent[] = SEED.map((s) => {
  const venue = VENUES[s.venue];
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: 'published',
    startAt: shiftSeedTime(s.start),
    endAt: shiftSeedTime(s.end),
    doorsAt: null,
    venueId: venue.id,
    venue,
    location: venue.location,
    addressOverride: null,
    categoryId: s.category,
    category: cat(s.category),
    musicGenre: s.genre ?? null,
    vibeTags: s.vibes,
    priceType: s.price,
    priceMin: s.min ?? null,
    priceMax: s.max ?? null,
    currency: 'EUR',
    ageRestriction: s.age ?? null,
    coverImageUrl: null,
    ticketUrl: s.ticket ?? null,
    externalUrl: s.external ?? null,
    organizerId: null,
    organizer: null,
    sourceUrl: null,
    popularityScore: s.pop,
    favoritesCount: 0,
  };
});

// ── „Live"-Demo: relativ zu JETZT datiert ───────────────────────────────────
// Die Seed-Events oben hängen an einer festen Tageszeit; je nach aktueller Uhr
// ist daher evtl. nichts „live". Diese Events werden relativ zur aktuellen Zeit
// gesetzt, damit „Läuft jetzt" und „Startet bald" immer demonstrierbar sind.
interface NowSeed {
  id: string;
  title: string;
  description: string;
  venue: keyof typeof VENUES;
  category: string;
  genre?: string;
  vibes: string[];
  price: DotsEvent['priceType'];
  min?: number;
  max?: number;
  age?: number;
  /** Start relativ zu jetzt in Minuten (negativ = läuft bereits). */
  startMin: number;
  /** Dauer in Stunden. */
  durH: number;
  pop: number;
}

const NOW_MS = Date.now();

function nowEvent(p: NowSeed): DotsEvent {
  const venue = VENUES[p.venue];
  const start = new Date(NOW_MS + p.startMin * 60_000);
  const end = new Date(start.getTime() + p.durH * 3_600_000);
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: 'published',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    doorsAt: null,
    venueId: venue.id,
    venue,
    location: venue.location,
    addressOverride: null,
    categoryId: p.category,
    category: cat(p.category),
    musicGenre: p.genre ?? null,
    vibeTags: p.vibes,
    priceType: p.price,
    priceMin: p.min ?? null,
    priceMax: p.max ?? null,
    currency: 'EUR',
    ageRestriction: p.age ?? null,
    coverImageUrl: null,
    ticketUrl: null,
    externalUrl: null,
    organizerId: null,
    organizer: null,
    sourceUrl: null,
    popularityScore: p.pop,
    favoritesCount: 0,
  };
}

const LIVE_DEMO: DotsEvent[] = [
  nowEvent({ id: 'live1', title: 'Pulse — Techno Now', description: 'Treibender Techno, gerade jetzt auf dem Floor.', venue: 'pulse', category: 'clubbing', genre: 'Techno', vibes: ['Popular', 'Techno'], price: 'paid', min: 12, max: 15, age: 18, startMin: -40, durH: 6, pop: 90 }),
  nowEvent({ id: 'live2', title: 'Gibson Live Floor', description: 'House-Allnighter — läuft bereits.', venue: 'gibson', category: 'clubbing', genre: 'House', vibes: ['House', 'Guestlist'], price: 'paid', min: 14, age: 18, startMin: -75, durH: 6, pop: 84 }),
  nowEvent({ id: 'soon1', title: 'Velvet Rooftop Sundown', description: 'Sundowner mit melodischen Beats — startet gleich.', venue: 'velvet', category: 'rooftop', genre: 'Melodic House', vibes: ['Rooftop', 'Sunset'], price: 'paid', min: 10, age: 21, startMin: 45, durH: 4, pop: 72 }),
  nowEvent({ id: 'soon2', title: 'Lavaña After Work', description: 'After-Work-Drinks über den Dächern — gleich los.', venue: 'lavana', category: 'rooftop', genre: 'Disco', vibes: ['Afterwork', 'Cocktails'], price: 'free', age: 21, startMin: 80, durH: 4, pop: 58 }),
];

export const FIXTURE_EVENTS: DotsEvent[] = [...SEED_EVENTS, ...LIVE_DEMO];

// ── Demo-Social-Daten (bis Supabase/Auth verbunden ist) ─────────────────────
export interface DemoFriend {
  id: string;
  name: string;
  /** Avatar-Farbe (Initialen-Kreis). */
  color: string;
  /** Event-IDs, zu denen diese:r Demo-Freund:in zugesagt hat. */
  attending: string[];
  /** Event-IDs, die diese:r Demo-Freund:in favorisiert hat (fürs Freundes-Profil). */
  favorites?: string[];
}

export const FIXTURE_FRIENDS: DemoFriend[] = [
  { id: 'f01', name: 'Lena', color: '#E84393', attending: ['e22', 'e24', 'e06', 'e18'], favorites: ['e21', 'e15', 'e09'] },
  { id: 'f02', name: 'Jonas', color: '#0984E3', attending: ['e21', 'e26', 'e02', 'e14'], favorites: ['e22', 'e10'] },
  { id: 'f03', name: 'Mara', color: '#00B894', attending: ['e23', 'e24', 'e11', 'e18'], favorites: ['e06', 'e21', 'e25'] },
  { id: 'f04', name: 'Tim', color: '#E17055', attending: ['e21', 'e25', 'e09', 'e12'], favorites: ['e24', 'e26'] },
];
