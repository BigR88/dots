import type { DotsEvent } from '@dots/shared';

/**
 * Zentrale, robuste Zeitstatus-Logik für Events („Läuft jetzt / Startet bald /
 * Später / Vorbei"). Arbeitet ausschließlich mit absoluten Zeitstempeln, daher
 * funktioniert Nightlife über Mitternacht (z. B. 23:00–04:00) korrekt.
 */

/** Planungsfenster für „Startet bald" (Minuten). 2h passt für Nightlife. */
export const STARTING_SOON_MINUTES = 120;

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;

// Default-Dauer je Kategorie (Stunden), falls keine Endzeit vorhanden ist.
const DEFAULT_DURATION_H: Record<string, number> = {
  clubbing: 6,
  bars: 4,
  day_drinking: 4,
  live_music: 3,
  special_event: 4,
  food_social: 3,
  rooftop: 4,
  open_air: 4,
  student_party: 5,
  culture: 4,
};
const FALLBACK_DURATION_H = 4;

/** Endzeit eines Events — echte Endzeit oder Kategorie-Default ab Start. */
export function getEventEndTime(event: Pick<DotsEvent, 'startAt' | 'endAt' | 'category'>): Date {
  const start = new Date(event.startAt);
  if (event.endAt) {
    // endAt nur vertrauen, wenn es echt nach dem Start liegt (sonst Datenfehler →
    // Kategorie-Default, damit ein laufendes Event nicht sofort „vorbei" ist).
    const end = new Date(event.endAt);
    if (end.getTime() > start.getTime()) return end;
  }
  const h = (event.category?.slug && DEFAULT_DURATION_H[event.category.slug]) || FALLBACK_DURATION_H;
  return new Date(start.getTime() + h * MS_PER_HOUR);
}

export type EventTimeStatus = 'live' | 'soon' | 'later' | 'past';

/**
 * Roher Zeitstatus relativ zu `now`:
 *  - live  : now in [start, end)
 *  - soon  : startet in <= STARTING_SOON_MINUTES
 *  - later : startet später als das
 *  - past  : bereits vorbei
 */
export function getEventTimeStatus(
  event: Pick<DotsEvent, 'startAt' | 'endAt' | 'category'>,
  now: Date = new Date(),
): EventTimeStatus {
  const start = new Date(event.startAt).getTime();
  const end = getEventEndTime(event).getTime();
  const t = now.getTime();
  if (t >= end) return 'past';
  if (t >= start) return 'live';
  if (start - t <= STARTING_SOON_MINUTES * MS_PER_MIN) return 'soon';
  return 'later';
}

function startOfTomorrow(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Anzeige-Status für die UI. `liveContext` = wird der heutige Tag betrachtet?
 * Nur dann sind Live-Status sinnvoll; für zukünftige Tage `null` → die UI zeigt
 * stattdessen die Uhrzeit. „later" erscheint nur für Events, die HEUTE noch
 * starten (nicht für Events eines künftigen Tages in einer Wochenansicht).
 */
export function displayTimeStatus(
  event: Pick<DotsEvent, 'startAt' | 'endAt' | 'category'>,
  now: Date,
  liveContext: boolean,
): EventTimeStatus | null {
  if (!liveContext) return null;
  const s = getEventTimeStatus(event, now);
  if (s === 'live' || s === 'soon') return s;
  if (s === 'later') {
    return new Date(event.startAt) < startOfTomorrow(now) ? 'later' : null;
  }
  return 'past';
}

/** Kurzes Label für die Status-Pill. */
export function timeStatusLabel(status: EventTimeStatus): string {
  switch (status) {
    case 'live':
      return 'Läuft jetzt';
    case 'soon':
      return 'Startet bald';
    case 'later':
      return 'Später';
    case 'past':
      return 'Vorbei';
  }
}
