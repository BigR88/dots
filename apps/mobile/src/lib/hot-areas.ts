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

/** CSS des weichen Hot-Area-Glows — in beiden Hosts identisch.
 * Nightlife-Energie: warmer Kern, der über Neon-Pink nach Lila ausläuft und
 * langsam „atmet". Die Deckkraft (Intensität) liegt inline auf .dots-hot; das
 * innere <i> trägt Verlauf + Animation, damit die Animation die inline-Opacity
 * nicht überschreibt. Energie-Zonen (.dots-zone) nutzen dieselbe Struktur,
 * atmen aber langsamer — ruhige Ambient-Schicht statt Daten-Hotspot. */
export const HOT_AREA_CSS = `
.dots-hot-icon{background:transparent!important;border:0!important;}
.dots-hot{border-radius:50%;}
.dots-hot i{display:block;width:100%;height:100%;border-radius:50%;
  background:radial-gradient(circle, rgba(255,132,120,.22) 0%, rgba(236,88,180,.15) 40%, rgba(140,84,255,.09) 62%, rgba(140,84,255,0) 76%);
  animation:dots-hot-breathe 5.4s ease-in-out infinite alternate;}
@keyframes dots-hot-breathe{from{transform:scale(.92);opacity:.72}to{transform:scale(1.08);opacity:1}}
.dots-zone{border-radius:50%;}
.dots-zone i{display:block;width:100%;height:100%;border-radius:50%;
  animation:dots-zone-breathe 9s ease-in-out infinite alternate;}
@keyframes dots-zone-breathe{from{transform:scale(.95);opacity:.8}to{transform:scale(1.05);opacity:1}}
@media (prefers-reduced-motion: reduce){.dots-zone i{animation:none!important;}}
`;

/** Glow nur bei niedrigem/mittlerem Zoom — bei nahem Zoom ausblenden. */
export const HOT_AREA_MAX_ZOOM = 14.5;

/**
 * Statische Nightlife-Energie-Zonen: die bekannten Ausgeh-Gegenden Frankfurts
 * als sehr weiche, farbige Ambient-Glows — die Stadt wirkt lebendig, auch wo
 * gerade kein Daten-Hotspot ist. Farben bewusst gemischt (nicht nur Lila),
 * Deckkraft niedrig: Atmosphäre, keine Heatmap.
 */
export interface EnergyZone {
  id: string;
  lat: number;
  lon: number;
  /** Radius in Metern (Ausdehnung des Glows). */
  radiusM: number;
  /** Glow-Farbe (hex, ohne Alpha — Alpha setzt das CSS-Gradient). */
  color: string;
}

export const ENERGY_ZONES: EnergyZone[] = [
  { id: 'innenstadt', lat: 50.1135, lon: 8.683, radiusM: 620, color: '#8B5CF6' }, // Violett
  { id: 'bahnhofsviertel', lat: 50.1068, lon: 8.6675, radiusM: 430, color: '#EC4899' }, // Pink
  { id: 'sachsenhausen', lat: 50.1028, lon: 8.6895, radiusM: 520, color: '#FB923C' }, // Orange
  { id: 'mainufer', lat: 50.1058, lon: 8.6785, radiusM: 460, color: '#22D3EE' }, // Cyan
  { id: 'bockenheim', lat: 50.1238, lon: 8.6495, radiusM: 480, color: '#3B82F6' }, // Blau
  { id: 'bornheim', lat: 50.1268, lon: 8.708, radiusM: 470, color: '#34D399' }, // Grün
  { id: 'ostend', lat: 50.1122, lon: 8.7075, radiusM: 500, color: '#F59E0B' }, // Amber
];

/** Zonen bei nahem Zoom ausblenden (Detailansicht gehört den Markern/Labels). */
export const ENERGY_ZONE_MAX_ZOOM = 15.25;

/**
 * Tageszeit-Dramaturgie: wie stark die Nightlife-Glows gerade leuchten (0..1).
 * Tagsüber gedimmt, ab dem frühen Abend hochfahren, nachts volle Energie,
 * im Morgengrauen wieder runter — „die Stadt wacht abends auf".
 * (Bewusst nie 0: Daydrinking/Open-Air-Energie gibt es auch mittags.)
 */
export function nightEnergyFactor(now: Date = new Date()): number {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 21 || h < 4) return 1; // Nacht: volle Energie
  if (h >= 16) return 0.5 + 0.5 * ((h - 16) / 5); // 16→21 Uhr: hochfahren
  if (h < 8) return 1 - 0.5 * ((h - 4) / 4); // 4→8 Uhr: ausklingen
  return 0.5; // Tag
}

/**
 * HTML eines Zonen-Glows (d = Pixel-Durchmesser). Farbe als hex+Alpha-Stufen
 * (auf der hellen Basemap etwas kräftiger als früher auf der dunklen).
 * `energy` dimmt per Tageszeit (inline auf dem Wrapper, damit die Atmungs-
 * Animation auf <i> sie nicht überschreibt); `phaseSec` versetzt die Atmung,
 * damit die Zonen nicht mechanisch im Gleichtakt pulsieren.
 */
export function energyZoneHtml(zone: EnergyZone, d: number, energy = 1, phaseSec = 0): string {
  const c = zone.color;
  return (
    `<div class="dots-zone" style="width:${d}px;height:${d}px;opacity:${energy}">` +
    `<i style="background:radial-gradient(circle, ${c}30 0%, ${c}1c 42%, ${c}00 72%);animation-delay:-${phaseSec}s"></i></div>`
  );
}
