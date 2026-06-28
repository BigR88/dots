import type { DotsEvent, GeoPoint, QuickFilterId } from '@dots/shared';
import { distanceMeters } from '@/lib/geo';
import { isFree, isUnder20 } from '@/lib/format';
import { displayTimeStatus } from '@/lib/event-time';

/**
 * Zentrale Map-Filterlogik — EINE Quelle, keine doppelte Filterung in Komponenten.
 * Reihenfolge (Schnittmenge, daher kommutativ): Kategorie → Schnellfilter →
 * Nähe → Zeitstatus. Datum + Suche laufen bereits in der Query (data/events.ts).
 */

/** Nearby Mode: Standard-Radius, Fallback wenn nichts in der Nähe ist. */
export const NEARBY_RADIUS_M = 1500;
export const NEARBY_FALLBACK_M = 3000;

/** Zeitstatus-Filter kennt nur diese drei (kein „Alle" — null = alle). */
export type TimeStatusFilter = 'live' | 'soon' | 'later';

export interface MapFilterState {
  /** Mehrfachauswahl Kategorien (leer = alle). */
  categorySlugs: string[];
  /** Schnellfilter: 'free' | 'under_20' | 'near_me'. */
  quick: QuickFilterId[];
  /** Zeitstatus-Chip (nur am heutigen Tag relevant); null = alle. */
  timeStatus: TimeStatusFilter | null;
}

export interface MapFilterContext {
  now: Date;
  /** Wird der heutige Tag betrachtet? Nur dann greift der Zeitstatus-Filter. */
  liveContext: boolean;
  origin: GeoPoint | null;
}

export function filterEventsByCategory(events: DotsEvent[], slugs: string[]): DotsEvent[] {
  if (!slugs.length) return events;
  const set = new Set(slugs);
  return events.filter((e) => e.category != null && set.has(e.category.slug));
}

export function filterEventsByQuick(events: DotsEvent[], quick: QuickFilterId[]): DotsEvent[] {
  let out = events;
  if (quick.includes('free')) out = out.filter((e) => isFree(e));
  if (quick.includes('under_20')) out = out.filter((e) => isUnder20(e));
  return out;
}

/**
 * Nähe-Filter: Events im Standardradius (1,5 km); ist dort nichts, automatisch
 * auf 3 km erweitern. Ohne Standort unverändert (Filter greift nicht).
 */
export function filterEventsByNearby(events: DotsEvent[], origin: GeoPoint | null): DotsEvent[] {
  if (!origin) return events;
  const within = (r: number) =>
    events.filter((e) => {
      const loc = e.location ?? e.venue?.location ?? null;
      return loc != null && distanceMeters(origin, loc) <= r;
    });
  const near = within(NEARBY_RADIUS_M);
  return near.length ? near : within(NEARBY_FALLBACK_M);
}

export function filterEventsByTimeStatus(
  events: DotsEvent[],
  status: TimeStatusFilter | null,
  now: Date,
  liveContext: boolean,
): DotsEvent[] {
  if (!status || !liveContext) return events;
  return events.filter((e) => displayTimeStatus(e, now, true) === status);
}

/**
 * „Basis"-Set: alles außer Zeitstatus (Kategorie + Schnellfilter + Nähe).
 * Praktisch für die Zeit-Chip-Counts (zählen relativ zu den übrigen Filtern).
 */
export function applyBaseFilters(
  events: DotsEvent[],
  state: MapFilterState,
  ctx: MapFilterContext,
): DotsEvent[] {
  let out = filterEventsByCategory(events, state.categorySlugs);
  out = filterEventsByQuick(out, state.quick);
  if (state.quick.includes('near_me')) out = filterEventsByNearby(out, ctx.origin);
  return out;
}

export interface TimeStatusCounts {
  live: number;
  soon: number;
  later: number;
}

/** Counts für die Zeit-Chips (auf dem bereits anderweitig gefilterten Set). */
export function timeStatusCounts(events: DotsEvent[], now: Date, liveContext: boolean): TimeStatusCounts {
  const c: TimeStatusCounts = { live: 0, soon: 0, later: 0 };
  if (!liveContext) return c;
  for (const e of events) {
    const s = displayTimeStatus(e, now, true);
    if (s === 'live' || s === 'soon' || s === 'later') c[s] += 1;
  }
  return c;
}

/**
 * Aktive Filter fürs Badge am Filterbutton (Kategorie + Schnellfilter).
 * „Nähe" zählt nur als aktiv, wenn ein Standort vorhanden ist (sonst filtert es
 * nichts und würde das Badge irreführend erhöhen).
 */
export function getActiveFilterCount(
  state: Pick<MapFilterState, 'categorySlugs' | 'quick'>,
  hasLocation = false,
): number {
  const quickCount = state.quick.filter((q) => q !== 'near_me' || hasLocation).length;
  return state.categorySlugs.length + quickCount;
}
