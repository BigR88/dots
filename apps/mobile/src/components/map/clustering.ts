import type { DotsEvent, GeoPoint } from '@dots/shared';
import { project, type MapCamera, type ScreenPoint, type Viewport } from '@/lib/geo';

export interface MapCluster {
  id: string;
  screen: ScreenPoint;
  center: GeoPoint;
  events: DotsEvent[];
}

const CLUSTER_RADIUS_PX = 56;

// Greedy Screen-Space-Clustering: Events, die im aktuellen Zoom näher als
// CLUSTER_RADIUS_PX beieinander liegen, werden zu einem Cluster zusammengefasst.
export function clusterEvents(
  events: DotsEvent[],
  cam: MapCamera,
  vp: Viewport,
): MapCluster[] {
  const located = events.filter((e) => e.location != null);
  const placed = located.map((e) => ({
    event: e,
    screen: project(e.location as GeoPoint, cam, vp),
  }));

  const clusters: MapCluster[] = [];
  const taken = new Set<number>();

  for (let i = 0; i < placed.length; i++) {
    if (taken.has(i)) continue;
    const group = [placed[i]];
    taken.add(i);
    for (let j = i + 1; j < placed.length; j++) {
      if (taken.has(j)) continue;
      const dx = placed[i].screen.x - placed[j].screen.x;
      const dy = placed[i].screen.y - placed[j].screen.y;
      if (Math.hypot(dx, dy) <= CLUSTER_RADIUS_PX) {
        group.push(placed[j]);
        taken.add(j);
      }
    }

    const sx = group.reduce((s, g) => s + g.screen.x, 0) / group.length;
    const sy = group.reduce((s, g) => s + g.screen.y, 0) / group.length;
    const clon =
      group.reduce((s, g) => s + (g.event.location as GeoPoint).lon, 0) / group.length;
    const clat =
      group.reduce((s, g) => s + (g.event.location as GeoPoint).lat, 0) / group.length;

    clusters.push({
      id: group.map((g) => g.event.id).join('+'),
      screen: { x: sx, y: sy },
      center: { lon: clon, lat: clat },
      events: group.map((g) => g.event),
    });
  }

  return clusters;
}
