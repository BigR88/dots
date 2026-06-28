import type { CandidateStatus, DotsEvent, EventStatus } from '@dots/shared';

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Entwurf',
  needs_review: 'Review nötig',
  pending_review: 'Zur Prüfung',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
  expired: 'Abgelaufen',
  rejected: 'Abgelehnt',
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: 'Zu prüfen',
  approved: 'Übernommen',
  rejected: 'Abgelehnt',
  duplicate: 'Duplikat',
};

/** Konfidenz-Stufe für Farbcodierung (high/mid/low). */
export function confidenceTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'mid';
  return 'low';
}

/** Startzeitpunkt eines Kandidaten (ISO start_datetime) hübsch darstellen. */
export function formatCandidateWhen(startDatetime: string | null): string {
  if (!startDatetime) return '— (Datum offen)';
  const d = new Date(startDatetime);
  if (Number.isNaN(d.getTime())) return startDatetime;
  return `${new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(d)} Uhr`;
}

/**
 * ISO-Datetime → Wert für <input type="datetime-local"> in Europe/Berlin-Wandzeit.
 * BEWUSST zeitzonen-fest (nicht getHours()): das Submit (datetimeOverride →
 * berlinWallToUtcIso) interpretiert den Wert ebenfalls als Berlin-Wandzeit, sonst
 * driftet der Round-Trip auf Nicht-Berlin-Servern (z. B. UTC-Deploy).
 */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour'); // en-CA kann '24' liefern
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

export function formatStart(iso: string): string {
  return `${dateFmt.format(new Date(iso))} Uhr`;
}

export function formatPrice(e: DotsEvent): string {
  switch (e.priceType) {
    case 'free':
      return 'Frei';
    case 'donation':
      return 'Spende';
    case 'paid':
      if (e.priceMin != null && e.priceMax != null && e.priceMax !== e.priceMin)
        return `${e.priceMin}–${e.priceMax} €`;
      if (e.priceMin != null) return `ab ${e.priceMin} €`;
      return 'Bezahlt';
    default:
      return '—';
  }
}

/** ISO → Wert für <input type="datetime-local"> in lokaler Zeit. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
