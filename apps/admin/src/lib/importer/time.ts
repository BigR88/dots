/**
 * Zeit-Helfer: alle Event-Zeiten sind Europe/Berlin-Wandzeiten. Diese Funktionen
 * rechnen serverzeitzonen-UNABHÄNGIG (wichtig auf UTC-Deploys), damit Pipeline-
 * Filter, Demo-Promote und der SQL-RPC promote_candidate dieselbe Zeit liefern.
 */

const BERLIN = 'Europe/Berlin';

/** Heutiges Datum in Berlin als YYYY-MM-DD. */
export function berlinToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BERLIN }).format(new Date());
}

export interface DateTableRow {
  /** Deutscher Wochentag, z. B. "Freitag". */
  weekday: string;
  /** YYYY-MM-DD (Berlin). */
  date: string;
  /** UTC-Offset an diesem Tag, z. B. "+02:00" (Sommer) / "+01:00" (Winter). */
  offset: string;
}

/**
 * Anker-Tabelle "Wochentag = Datum" für die nächsten `days` Tage (Europe/Berlin).
 * Damit löst die KI-Extraktion Wochentags-/relative Angaben ("diesen Freitag")
 * per Nachschlagen statt per Eigenrechnung auf — der häufigste Fehlerherd.
 * `fromDate` (YYYY-MM-DD) verankert die Tabelle für Tests deterministisch.
 */
export function berlinDateTable(days = 14, fromDate?: string): DateTableRow[] {
  const wd = new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN, weekday: 'long' });
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: BERLIN });
  const off = new Intl.DateTimeFormat('en-US', { timeZone: BERLIN, timeZoneName: 'longOffset' });
  // Basis mittags (UTC) → DST-Umstellungen verschieben den Kalendertag nicht.
  const baseMs = fromDate ? Date.parse(`${fromDate}T12:00:00Z`) : Date.now();
  const out: DateTableRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(baseMs + i * 86_400_000);
    const zone = off.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+01:00';
    out.push({ weekday: wd.format(d), date: iso.format(d), offset: zone.replace('GMT', '') || '+01:00' });
  }
  return out;
}

/** Offset (ms) der Zeitzone zu UTC für einen konkreten Instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

/** Wandzeit in einer IANA-Zone (YYYY-MM-DD + HH:MM[:SS]) → UTC-ISO (oder null). */
export function zonedWallToUtcIso(date: string, time: string, timeZone: string): string | null {
  if (!date) return null;
  const t = (time || '00:00').length === 5 ? `${time}:00` : time || '00:00:00';
  const naiveMs = Date.parse(`${date}T${t}Z`);
  if (Number.isNaN(naiveMs)) return null;
  let offset: number;
  try {
    offset = tzOffsetMs(new Date(naiveMs), timeZone);
  } catch {
    return null; // unbekannte Zeitzone
  }
  return new Date(naiveMs - offset).toISOString();
}

/** Berlin-Wandzeit (YYYY-MM-DD + HH:MM) → UTC-ISO-String (oder null). */
export function berlinWallToUtcIso(date: string, time: string): string | null {
  return zonedWallToUtcIso(date, time, BERLIN);
}

/**
 * Beliebigen Datums-String aus strukturierten Quellen (JSON-LD/iCal) zu einem
 * UTC-ISO normalisieren. Hat der String eine Zeitzone (Z/Offset) → direkt; ist
 * er naiv (ohne Zone) oder reines Datum → als Europe/Berlin interpretieren.
 */
export function normalizeToBerlinIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return berlinWallToUtcIso(v, '00:00'); // nur Datum
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = v.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/); // naive Wandzeit
  if (m) return berlinWallToUtcIso(m[1], m[2]);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
