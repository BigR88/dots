import { distanceMeters } from '@/lib/geo';
import type { VenueMarker } from '@/lib/venues';

/**
 * Proximity-Clustering für die Karte: bei niedrigem Zoom werden nah beieinander
 * liegende Venue-Marker zu EINER Cluster-Bubble mit Event-Zahl zusammengefasst
 * (bisher gruppierte nur die exakt gleiche Venue, ~11 m). Rein geographisch —
 * der Pixel-Radius wird über Meter-pro-Pixel in Meter umgerechnet, damit die
 * gleiche Logik in beiden Hosts (Web-Leaflet + WebView) in TS laufen kann.
 */

/** Oberhalb dieses Zooms wird nicht mehr geclustert (einzelne Venues sichtbar). */
export const CLUSTER_MAX_ZOOM = 13.75;

/** Marker näher als so viele Bildschirm-Pixel fallen zu einem Cluster zusammen. */
const CLUSTER_RADIUS_PX = 46;

export interface ClusterMarker {
  /** Stabiler Schlüssel aus den Member-Keys — gleiche Mitglieder = gleicher Key. */
  key: string;
  lat: number;
  lon: number;
  /** Summe der Events im Cluster. */
  count: number;
  /** Anzahl zusammengefasster Venues. */
  venueCount: number;
  /** Höchste Beliebtheit im Cluster 0..1. */
  intensity: number;
  /** Mindestens ein Trending-Hotspot enthalten. */
  hot: boolean;
}

/** Meter pro Bildschirm-Pixel bei gegebenem Zoom/Breitengrad (Web-Mercator). */
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Greedy-Clustering, beliebteste Marker zuerst als Seeds (das hält die visuell
 * wichtigsten Orte im Cluster-Zentrum). Singles bleiben unverändert erhalten.
 */
export function clusterMarkers(
  markers: VenueMarker[],
  zoom: number,
): { singles: VenueMarker[]; clusters: ClusterMarker[] } {
  if (zoom > CLUSTER_MAX_ZOOM || markers.length < 2) return { singles: markers, clusters: [] };

  const used = new Array(markers.length).fill(false);
  const singles: VenueMarker[] = [];
  const clusters: ClusterMarker[] = [];
  const seeds = markers
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.intensity - a.m.intensity);

  for (const { m, i } of seeds) {
    if (used[i]) continue;
    used[i] = true;
    const radiusM = CLUSTER_RADIUS_PX * metersPerPixel(m.lat, zoom);
    const members = [m];
    for (let j = 0; j < markers.length; j++) {
      if (used[j]) continue;
      if (distanceMeters(m, markers[j]) <= radiusM) {
        members.push(markers[j]);
        used[j] = true;
      }
    }
    if (members.length === 1) {
      singles.push(m);
      continue;
    }
    clusters.push({
      key: 'cluster:' + members.map((x) => x.key).sort().join('|'),
      lat: members.reduce((s, x) => s + x.lat, 0) / members.length,
      lon: members.reduce((s, x) => s + x.lon, 0) / members.length,
      count: members.reduce((s, x) => s + x.count, 0),
      venueCount: members.length,
      intensity: members.reduce((mx, x) => Math.max(mx, x.intensity), 0),
      hot: members.some((x) => x.hot),
    });
  }

  return { singles, clusters };
}
