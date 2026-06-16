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

/** Berlin-Wandzeit (YYYY-MM-DD + HH:MM) → UTC-ISO-String (oder null). */
export function berlinWallToUtcIso(date: string, time: string): string | null {
  if (!date) return null;
  const naiveMs = Date.parse(`${date}T${time || '00:00'}:00Z`);
  if (Number.isNaN(naiveMs)) return null;
  const offset = tzOffsetMs(new Date(naiveMs), BERLIN);
  return new Date(naiveMs - offset).toISOString();
}
