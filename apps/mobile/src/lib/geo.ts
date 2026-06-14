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

// ── Karten-Projektion (für die Demo-Karte) ──────────────────────────────────
// Einfache äquirektanguläre Projektion um ein Center. Für Stadtgröße völlig
// ausreichend; bleibt hinter dem MapProvider gekapselt (echtes Mapbox später).

export interface Viewport {
  width: number;
  height: number;
}

export interface MapCamera {
  center: GeoPoint;
  /** Pixel pro Grad Breitengrad. Höher = stärker reingezoomt. */
  scale: number;
}

export const MIN_SCALE = 1_200;
export const MAX_SCALE = 90_000;
export const DEFAULT_SCALE = 14_000;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export interface ScreenPoint {
  x: number;
  y: number;
}

// lon/lat → Screen-Pixel relativ zum Viewport-Mittelpunkt.
export function project(p: GeoPoint, cam: MapCamera, vp: Viewport): ScreenPoint {
  const lonScale = cam.scale * Math.cos(toRad(cam.center.lat));
  const x = vp.width / 2 + (p.lon - cam.center.lon) * lonScale;
  const y = vp.height / 2 - (p.lat - cam.center.lat) * cam.scale;
  return { x, y };
}

// Screen-Pixel → lon/lat (für Pan: Delta in Pixeln in Grad umrechnen).
export function unproject(s: ScreenPoint, cam: MapCamera, vp: Viewport): GeoPoint {
  const lonScale = cam.scale * Math.cos(toRad(cam.center.lat));
  const lon = cam.center.lon + (s.x - vp.width / 2) / lonScale;
  const lat = cam.center.lat - (s.y - vp.height / 2) / cam.scale;
  return { lon, lat };
}

// Pixel-Delta beim Pan in eine Center-Verschiebung übersetzen.
export function panCenter(
  cam: MapCamera,
  dxPx: number,
  dyPx: number,
): GeoPoint {
  const lonScale = cam.scale * Math.cos(toRad(cam.center.lat));
  return {
    lon: cam.center.lon - dxPx / lonScale,
    lat: cam.center.lat + dyPx / cam.scale,
  };
}
