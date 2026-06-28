import { Linking } from 'react-native';
import type { DotsEvent } from '@dots/shared';

/**
 * Frontend-Navigation zur Event-Location über Maps-URLs (kein Backend).
 * Primär per Koordinaten, Fallback per Location-Namen. Web öffnet einen neuen
 * Tab, native/WebView öffnet system-/app-nah via Linking.
 */

export function buildMapsRouteUrl(event: Pick<DotsEvent, 'location' | 'venue' | 'addressOverride'>): string | null {
  const loc = event.location ?? event.venue?.location ?? null;
  if (loc) {
    return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}`;
  }
  const name = event.venue?.name ?? event.addressOverride ?? null;
  if (name) {
    const q = encodeURIComponent(`${name}, Frankfurt am Main`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  return null;
}

/** Gibt es genug Daten, um eine Route zu öffnen? (Button sonst ausblenden.) */
export function canOpenRoute(event: Pick<DotsEvent, 'location' | 'venue' | 'addressOverride'>): boolean {
  return buildMapsRouteUrl(event) != null;
}

export async function openRoute(
  event: Pick<DotsEvent, 'location' | 'venue' | 'addressOverride'>,
): Promise<void> {
  const url = buildMapsRouteUrl(event);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    /* Kein Maps-Handler verfügbar — still ignorieren, App bleibt stabil. */
  }
}
