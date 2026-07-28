import { Linking } from 'react-native';
import type { DotsEvent } from '@dots/shared';

/**
 * Frontend-Navigation zur Event-Location über Maps-URLs (kein Backend).
 * Der Nutzer wählt den Anbieter (Apple Karten / Google Maps) selbst — siehe
 * RouteChooserSheet. Es gibt IMMER ein Ziel: Koordinaten (bevorzugt), sonst
 * Suche per Venue/Adresse/Titel, notfalls „Frankfurt am Main" — so ist die
 * Route zu jedem Event verfügbar. Web öffnet einen neuen Tab, native/WebView
 * öffnet system-/app-nah via Linking.
 */

export type MapsProvider = 'apple' | 'google';

type RouteEvent = Pick<DotsEvent, 'location' | 'venue' | 'addressOverride' | 'title'>;

/** Ziel als Koordinaten (bevorzugt) oder – Fallback – als Suchtext. Immer gesetzt. */
function destination(event: RouteEvent): { lat: number; lon: number } | { query: string } {
  const loc = event.location ?? event.venue?.location ?? null;
  if (loc) return { lat: loc.lat, lon: loc.lon };
  // Ohne Koordinaten: sinnvollste Suche zusammenbauen (immer ein Ergebnis).
  const name = event.venue?.name ?? event.addressOverride ?? event.title ?? null;
  return { query: name ? `${name}, Frankfurt am Main` : 'Frankfurt am Main' };
}

/** Baut die Routen-/Such-URL für den gewählten Anbieter (immer eine URL). */
export function buildRouteUrl(event: RouteEvent, provider: MapsProvider): string {
  const dest = destination(event);

  if (provider === 'apple') {
    // `daddr` = Zieladresse → Apple Karten öffnet direkt die Wegbeschreibung.
    if ('lat' in dest) return `https://maps.apple.com/?daddr=${dest.lat},${dest.lon}&dirflg=d`;
    return `https://maps.apple.com/?q=${encodeURIComponent(dest.query)}`;
  }

  // google
  if ('lat' in dest) return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.query)}`;
}

/** Route ist immer verfügbar — die Funktion bleibt für Aufrufer erhalten. */
export function canOpenRoute(_event: RouteEvent): boolean {
  return true;
}

/** Öffnet die Route beim gewählten Anbieter. */
export async function openRouteWith(event: RouteEvent, provider: MapsProvider): Promise<void> {
  const url = buildRouteUrl(event, provider);
  try {
    await Linking.openURL(url);
  } catch {
    /* Kein Maps-Handler verfügbar — still ignorieren, App bleibt stabil. */
  }
}
