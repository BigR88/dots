import type { Category, DotsEvent, GeoPoint, Venue } from '@dots/shared';
import { CATEGORY_BY_SLUG } from '@dots/shared';

/**
 * Clientseitige TEST-Events — werden in der App-Liste zu den echten Events
 * gemerged, damit Datumsauswahl & Map-Gruppierung sofort demonstrierbar sind.
 * Bewusst NICHT in der Datenbank (keine Migration, kein Schreibzugriff nötig).
 * Datiert relativ zu „heute", also immer in den nächsten Tagen sichtbar.
 *
 * → Für Produktion: durch echte Events ersetzen oder ins Seed/DB übernehmen.
 */

function cat(slug: string): Category {
  const d = CATEGORY_BY_SLUG[slug];
  return { id: slug, slug, name: d.name, icon: d.icon, color: d.color, sortOrder: 0, isActive: true };
}

function venue(id: string, name: string, address: string, loc: GeoPoint): Venue {
  return {
    id,
    name,
    address,
    city: 'Frankfurt am Main',
    postalCode: null,
    location: loc,
    description: null,
    websiteUrl: null,
    instagram: null,
  };
}

// Reale Frankfurter Locations (für plausible Pins).
const V = {
  gibson: venue('test-gibson', 'Gibson Club', 'Zeil 85-93', { lat: 50.1148, lon: 8.684 }),
  tanzhaus: venue('test-tanzhaus', 'Tanzhaus West', 'Gutleutstraße 294', { lat: 50.1006, lon: 8.6228 }),
  mainnizza: venue('test-mainnizza', 'MainNizza', 'Untermainkai 17', { lat: 50.1075, lon: 8.6735 }),
  citybeach: venue('test-citybeach', 'City Beach Frankfurt', 'Hasengasse 5-7', { lat: 50.1138, lon: 8.6818 }),
};

// ISO-Zeitstempel für „heute + offset Tage" zur Uhrzeit hh:mm (lokal).
function at(now: Date, offsetDays: number, hour: number, min = 0): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

interface Spec {
  id: string;
  title: string;
  venue: Venue;
  category: string;
  offset: number;
  hour: number;
  min?: number;
  pop: number;
  free?: boolean;
  minP?: number;
  maxP?: number;
}

function build(now: Date, s: Spec): DotsEvent {
  const free = s.free ?? false;
  return {
    id: s.id,
    title: s.title,
    description: 'Test-Event (Demo).',
    status: 'published',
    startAt: at(now, s.offset, s.hour, s.min ?? 0),
    endAt: null,
    doorsAt: null,
    venueId: s.venue.id,
    venue: s.venue,
    location: s.venue.location,
    addressOverride: null,
    categoryId: s.category,
    category: cat(s.category),
    musicGenre: null,
    vibeTags: [],
    priceType: free ? 'free' : 'paid',
    priceMin: free ? null : s.minP ?? 10,
    priceMax: free ? null : s.maxP ?? null,
    currency: 'EUR',
    ageRestriction: null,
    coverImageUrl: null,
    ticketUrl: null,
    externalUrl: null,
    organizerId: null,
    organizer: null,
    sourceUrl: null,
    popularityScore: s.pop,
    favoritesCount: 0,
  };
}

/** Erzeugt die Test-Events relativ zum aktuellen Datum. */
export function buildTestEvents(now: Date = new Date()): DotsEvent[] {
  const specs: Spec[] = [
    // Heute: zwei verschiedene Standorte → zwei Pins
    { id: 'test-today-club', title: 'Techno Tonight', venue: V.tanzhaus, category: 'clubbing', offset: 0, hour: 23, pop: 88, minP: 15, maxP: 20 },
    { id: 'test-today-roof', title: 'Afterwork Rooftop', venue: V.mainnizza, category: 'rooftop', offset: 0, hour: 19, pop: 55, minP: 8 },
    // Morgen
    { id: 'test-tom-day', title: 'Day Drinking am Main', venue: V.citybeach, category: 'day_drinking', offset: 1, hour: 14, pop: 42, free: true },
    // Gibson Club: drei Events an drei Tagen → in „Nächste 7 Tage" ein Pin mit „3"
    { id: 'test-gib-1', title: 'Hip Hop Night', venue: V.gibson, category: 'clubbing', offset: 2, hour: 23, pop: 70, minP: 12 },
    { id: 'test-gib-2', title: 'Afro House Special', venue: V.gibson, category: 'clubbing', offset: 3, hour: 23, min: 30, pop: 92, minP: 14, maxP: 18 },
    { id: 'test-gib-3', title: 'Daydrinking Session', venue: V.gibson, category: 'day_drinking', offset: 4, hour: 16, pop: 48, free: true },
    // Weitere Einzeltage
    { id: 'test-sun-live', title: 'Live Jazz am Kai', venue: V.mainnizza, category: 'live_music', offset: 5, hour: 18, pop: 33, minP: 10 },
  ];
  return specs.map((s) => build(now, s));
}
