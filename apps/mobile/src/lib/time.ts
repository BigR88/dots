import { NEXT_7_DAYS, TRENDING, type TimeValue } from '@dots/shared';

export interface DateRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lokaler ISO-Tag `YYYY-MM-DD` (ohne Zeitzone-Verschiebung). */
export function isoDay(d: Date): string {
  const x = startOfDay(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** True, wenn der String ein konkreter ISO-Tag `YYYY-MM-DD` ist (nicht 'next7'/'trending'). */
export function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Anzahl Tage im „Nächste 7 Tage"-Bereich (heute + 6 Folgetage). */
export const NEXT_DAYS_COUNT = 7;
// „Beliebt" deckt die nächsten 14 Tage ab (für eine spätere eigene Section).
const TRENDING_WINDOW_DAYS = 14;

/**
 * Zeitfenster für eine Auswahl:
 *  - ISO-Tag        → genau dieser Tag (00:00 → nächster Tag 00:00)
 *  - 'next7'        → heute → heute + 7 (die nächsten 7 Tage)
 *  - 'trending'     → heute → heute + 14 (für „Beliebt", nach Score sortiert)
 * Monats-/Jahreswechsel werden durch `Date.setDate` automatisch korrekt behandelt.
 */
export function rangeForTime(value: TimeValue, now: Date = new Date()): DateRange {
  const today = startOfDay(now);
  if (value === NEXT_7_DAYS) return { from: today, to: addDays(today, NEXT_DAYS_COUNT) };
  if (value === TRENDING) return { from: today, to: addDays(today, TRENDING_WINDOW_DAYS) };
  const day = startOfDay(parseIsoDay(value));
  return { from: day, to: addDays(day, 1) };
}

export interface DayOption {
  /** ISO-Tag, dient als `TimeValue`. */
  value: string;
  date: Date;
  isToday: boolean;
  isTomorrow: boolean;
  /** Wochentag kurz, z. B. „Mi". */
  weekdayShort: string;
  /** Wochentag lang, z. B. „Mittwoch". */
  weekdayLong: string;
  /** Tag im Monat, z. B. 17. */
  dayNum: number;
  /** Monat lang, z. B. „Juni". */
  monthLong: string;
}

const wdShortFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const wdLongFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long' });
const monthLongFmt = new Intl.DateTimeFormat('de-DE', { month: 'long' });

/**
 * Dynamische Tagesoptionen ab heute — niemals hardcoded. Wochentag + Datum
 * kommen aus dem echten Gerätedatum; `Date` löst Monats-/Jahreswechsel korrekt.
 */
export function dayOptions(now: Date = new Date(), count = NEXT_DAYS_COUNT): DayOption[] {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    return {
      value: isoDay(date),
      date,
      isToday: i === 0,
      isTomorrow: i === 1,
      // `replace` entfernt den Punkt, den de-DE bei Kurz-Wochentagen anhängt („Mi.").
      weekdayShort: wdShortFmt.format(date).replace('.', ''),
      weekdayLong: wdLongFmt.format(date),
      dayNum: date.getDate(),
      monthLong: monthLongFmt.format(date),
    };
  });
}

/** `DayOption` für einen beliebigen ISO-Tag (auch außerhalb der 7-Tage-Liste). */
export function dayOptionFromIso(iso: string, now: Date = new Date()): DayOption {
  const date = startOfDay(parseIsoDay(iso));
  const todayIso = isoDay(now);
  const tomorrowIso = isoDay(addDays(startOfDay(now), 1));
  return {
    value: iso,
    date,
    isToday: iso === todayIso,
    isTomorrow: iso === tomorrowIso,
    weekdayShort: wdShortFmt.format(date).replace('.', ''),
    weekdayLong: wdLongFmt.format(date),
    dayNum: date.getDate(),
    monthLong: monthLongFmt.format(date),
  };
}

/** Kurzlabel für die Datumsleiste: „Heute 27.06" / „Morgen 28.06" / „29.06". */
export function shortDayLabel(opt: DayOption): string {
  const dd = String(opt.dayNum).padStart(2, '0');
  const mm = String(opt.date.getMonth() + 1).padStart(2, '0');
  const date = `${dd}.${mm}`;
  // Etwas größerer Abstand zwischen Wort und Datum (Em-Space statt normalem Space).
  const gap = ' ';
  if (opt.isToday) return `Heute${gap}${date}`;
  if (opt.isTomorrow) return `Morgen${gap}${date}`;
  return date;
}

/** Lange Zeile fürs Kalender-Sheet: „Heute, Dienstag 16. Juni". */
export function longDayLabel(opt: DayOption): string {
  const base = `${opt.weekdayLong} ${opt.dayNum}. ${opt.monthLong}`;
  if (opt.isToday) return `Heute, ${base}`;
  if (opt.isTomorrow) return `Morgen, ${base}`;
  return base;
}

// ── Monatskalender (Datums-Auswahl) ─────────────────────────────────────────

/** Wochentags-Kürzel, Woche beginnt montags. */
export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

export interface MonthCell {
  /** ISO-Tag `YYYY-MM-DD`, dient als `TimeValue`. */
  iso: string;
  date: Date;
  dayNum: number;
  /** Gehört die Zelle zum angezeigten Monat (vs. Rand-Tage aus Nachbarmonaten)? */
  inMonth: boolean;
}

const monthYearFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

/** Überschrift fürs Kalenderblatt, z. B. „Juni 2026". */
export function monthTitle(year: number, month: number): string {
  return monthYearFmt.format(new Date(year, month, 1));
}

/**
 * Tages-Raster eines Monats (Wochen beginnen montags). Enthält führende/folgende
 * Rand-Tage der Nachbarmonate (`inMonth: false`), damit die Wochen voll sind.
 * `Date` löst Monats-/Jahreswechsel automatisch korrekt auf.
 */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  // JS: 0=So … 6=Sa → in Mo=0 … So=6 umrechnen.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const date = new Date(year, month, 1 - lead + i);
    return { iso: isoDay(date), date, dayNum: date.getDate(), inMonth: date.getMonth() === month };
  });
}
