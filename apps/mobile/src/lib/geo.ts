import type { GeoPoint } from '@dots/shared';

// Frankfurt am Main — Default-Center & Bounds für die Karte (§7.2).
export const FRANKFURT_CENTER: GeoPoint = { lon: 8.682, lat: 50.113 };

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Luftlinie zwischen zwei Punkten in Metern (Haversine).
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Nutzerfreundliche Distanz: <1 km in Metern (50er-Schritte), sonst km.
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
