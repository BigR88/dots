import { Linking } from 'react-native';
import type { DotsEvent } from '@dots/shared';

/**
 * Frontend-Navigation zur Event-Location über Maps-URLs (kein Backend).
 * Der Nutzer wählt den Anbieter (Apple Karten / Google Maps) selbst — siehe
 * RouteChooserSheet. Primär per Koordinaten, Fallback per Location-Namen.
 * Web öffnet einen neuen Tab, native/WebView öffnet system-/app-nah via Linking.
 */

export type MapsProvider = 'apple' | 'google';

type RouteEvent = Pick<DotsEvent, 'location' | 'venue' | 'addressOverride'>;

/** Ziel als Koordinaten (bevorzugt) oder – Fallback – als Suchtext. */
function destination(event: RouteEvent): { lat: number; lon: number } | { query: string } | null {
  const loc = event.location ?? event.venue?.location ?? null;
  if (loc) return { lat: loc.lat, lon: loc.lon };
  const name = event.venue?.name ?? event.addressOverride ?? null;
  if (name) return { query: `${name}, Frankfurt am Main` };
  return null;
}

/** Baut die Routen-/Such-URL für den gewählten Anbieter. */
export function buildRouteUrl(event: RouteEvent, provider: MapsProvider): string | null {
  const dest = destination(event);
  if (!dest) return null;

  if (provider === 'apple') {
    // `daddr` = Zieladresse → Apple Karten öffnet direkt die Wegbeschreibung.
    if ('lat' in dest) return `https://maps.apple.com/?daddr=${dest.lat},${dest.lon}&dirflg=d`;
    return `https://maps.apple.com/?q=${encodeURIComponent(dest.query)}`;
  }

  // google
  if ('lat' in dest) return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.query)}`;
}

/** Gibt es genug Daten, um eine Route zu öffnen? (Button sonst ausblenden.) */
export function canOpenRoute(event: RouteEvent): boolean {
  return destination(event) != null;
}

/** Öffnet die Route beim gewählten Anbieter. */
export async function openRouteWith(event: RouteEvent, provider: MapsProvider): Promise<void> {
  const url = buildRouteUrl(event, provider);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    /* Kein Maps-Handler verfügbar — still ignorieren, App bleibt stabil. */
  }
}
