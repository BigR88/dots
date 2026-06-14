import type { TimeTabId } from '@dots/shared';

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

// Liefert das Zeitfenster für einen Tab. `trending` deckt die nächsten 14 Tage ab
// (sortiert wird dort nach popularity_score).
export function rangeForTab(tab: TimeTabId, now: Date = new Date()): DateRange {
  const today = startOfDay(now);
  switch (tab) {
    case 'today':
      return { from: today, to: addDays(today, 1) };
    case 'tomorrow':
      return { from: addDays(today, 1), to: addDays(today, 2) };
    case 'weekend': {
      // Kommendes Wochenende (Sa 00:00 → Mo 00:00). Ist heute schon Sa/So,
      // gilt das laufende Wochenende.
      const day = today.getDay(); // 0=So … 6=Sa
      let daysUntilSat = (6 - day + 7) % 7;
      if (day === 0) daysUntilSat = -1; // Sonntag gehört zum laufenden WE
      const sat = addDays(today, daysUntilSat);
      return { from: sat, to: addDays(sat, 2) };
    }
    case 'trending':
      return { from: today, to: addDays(today, 14) };
  }
}
