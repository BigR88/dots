import type { DotsEvent, GeoPoint } from '@dots/shared';

/**
 * Mehrere Events am selben Standort werden zu einer Gruppe zusammengefasst, damit
 * die Karte EINEN Pin pro Location zeigt (statt vieler übereinander).
 */
export interface VenueGroup {
  /** Stabiler Schlüssel: venueId, sonst aus Name+Koordinaten abgeleitet. */
  key: string;
  venueName: string;
  address: string | null;
  location: GeoPoint;
  /** Events an diesem Standort, chronologisch (Datum + Uhrzeit) sortiert. */
  events: DotsEvent[];
  /** Roh-Beliebtheit der Gruppe = höchster popularityScore ihrer Events. */
  popularity: number;
}

// Koordinaten auf ~11 m runden, damit „fast gleiche Stelle" zusammenfällt.
function coordKey(p: GeoPoint): string {
  return `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
}

/**
 * Gruppiert Events nach Standort. Primär über `venueId` (saubere ID aus den
 * Daten), sonst über stabile Fallbacks: Venue-Name + gerundete Koordinaten,
 * sonst nur Koordinaten. Vermeidet doppelte Pins an fast gleicher Stelle.
 */
export function groupEventsByVenue(events: DotsEvent[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>();

  for (const ev of events) {
    const loc = ev.location ?? ev.venue?.location ?? null;
    if (!loc) continue; // ohne Koordinaten kein Pin

    const key =
      ev.venueId ??
      (ev.venue?.name ? `${ev.venue.name}@${coordKey(loc)}` : coordKey(loc));

    const existing = map.get(key);
    if (existing) {
      existing.events.push(ev);
      existing.popularity = Math.max(existing.popularity, ev.popularityScore);
    } else {
      map.set(key, {
        key,
        venueName: ev.venue?.name ?? 'Frankfurt am Main',
        address: ev.venue?.address ?? ev.addressOverride ?? null,
        location: loc,
        events: [ev],
        popularity: ev.popularityScore,
      });
    }
  }

  // Events je Gruppe chronologisch sortieren (Datum + Uhrzeit).
  const groups = [...map.values()];
  for (const g of groups) {
    g.events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return groups;
}

export interface VenueMarker {
  key: string;
  lat: number;
  lon: number;
  /** Anzahl Events an diesem Standort (für die Pin-Zahl bei > 1). */
  count: number;
  /** Beliebtheits-Intensität 0..1 (steuert die Pin-Größe). */
  intensity: number;
  /** Kategorie-Farbe des beliebtesten Events am Standort (Pin-Farbe). */
  color: string;
}

const FALLBACK_COLOR = '#6C5CFF';

/**
 * Wandelt Gruppen in Map-Marker um. Farbe = Kategorie (vom beliebtesten Event
 * am Standort), Größe = Beliebtheit (relativ zum sichtbaren Set), Zahl = Anzahl
 * Events.
 */
export function toVenueMarkers(groups: VenueGroup[]): VenueMarker[] {
  const maxPop = groups.reduce((m, g) => Math.max(m, g.popularity), 0) || 1;
  return groups.map((g) => {
    const top = g.events.reduce((a, b) => (b.popularityScore > a.popularityScore ? b : a), g.events[0]);
    return {
      key: g.key,
      lat: g.location.lat,
      lon: g.location.lon,
      count: g.events.length,
      intensity: Math.min(1, g.popularity / maxPop),
      color: top.category?.color ?? FALLBACK_COLOR,
    };
  });
}
