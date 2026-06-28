import type { DotsEvent } from '@dots/shared';

/** Events chronologisch (frühestes zuerst). */
export function sortByStartAsc(events: DotsEvent[]): DotsEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

/**
 * Nächstes (kommendes) Event aus einer Liste. Fällt auf das früheste zurück,
 * wenn alle bereits vergangen sind, und auf `null` bei leerer Liste.
 */
export function nextUpcoming(events: DotsEvent[], now: number = Date.now()): DotsEvent | null {
  const sorted = sortByStartAsc(events);
  return sorted.find((e) => new Date(e.startAt).getTime() >= now) ?? sorted[0] ?? null;
}
