import type { DotsEvent, GeoPoint } from '@dots/shared';
import { distanceMeters } from '@/lib/geo';

/**
 * Hot Areas = dynamische Event-Dichte: wo liegen HEUTE viele Events nah
 * beieinander? Bewusst KEINE festen Stadtteil-Szenen, sondern aus den aktuellen
 * Event-Koordinaten greedy geclustert. Ergebnis ist Datengrundlage für einen
 * weichen Glow (Rendering in den MapProvidern, zoomabhängig).
 */

const HOT_RADIUS_M = 420; // Events innerhalb dieses Radius zählen zu einer Area
const HOT_MIN_COUNT = 3; // ab so vielen Events gilt eine Gegend als „hot"
const HOT_FULL_COUNT = 7; // ab hier maximale Intensität

export interface HotArea {
  lat: number;
  lon: number;
  /** Anzahl Events in der Area. */
  count: number;
  /** Räumliche Ausdehnung (max. Abstand zum Zentrum) in Metern. */
  spreadM: number;
  /** 0..1 — steuert Größe/Deckkraft des Glows. */
  intensity: number;
}

/** Greedy-Clustering der Event-Koordinaten zu Hot Areas. */
export function calculateHotAreas(events: DotsEvent[]): HotArea[] {
  const pts: GeoPoint[] = events
    .map((e) => e.location ?? e.venue?.location ?? null)
    .filter((p): p is GeoPoint => p != null);

  const used = new Array(pts.length).fill(false);
  const areas: HotArea[] = [];

  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    const members: GeoPoint[] = [pts[i]];
    used[i] = true;
    for (let j = i + 1; j < pts.length; j++) {
      if (used[j]) continue;
      if (distanceMeters(pts[i], pts[j]) <= HOT_RADIUS_M) {
        members.push(pts[j]);
        used[j] = true;
      }
    }
    if (members.length < HOT_MIN_COUNT) continue;

    const lat = members.reduce((s, p) => s + p.lat, 0) / members.length;
    const lon = members.reduce((s, p) => s + p.lon, 0) / members.length;
    const center: GeoPoint = { lat, lon };
    const spreadM = members.reduce((m, p) => Math.max(m, distanceMeters(center, p)), 0);
    const intensity = Math.min(1, (members.length - HOT_MIN_COUNT + 1) / (HOT_FULL_COUNT - HOT_MIN_COUNT + 1));
    areas.push({ lat, lon, count: members.length, spreadM, intensity });
  }

  return areas;
}

/** CSS des weichen Hot-Area-Glows — in beiden Hosts identisch. */
export const HOT_AREA_CSS = `
.dots-hot-icon{background:transparent!important;border:0!important;}
.dots-hot{border-radius:50%;
  background:radial-gradient(circle, rgba(255,176,84,.22) 0%, rgba(255,150,70,.12) 42%, rgba(255,150,70,0) 72%);}
`;

/** Glow nur bei niedrigem/mittlerem Zoom — bei nahem Zoom ausblenden. */
export const HOT_AREA_MAX_ZOOM = 14.5;
