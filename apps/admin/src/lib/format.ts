import type { DotsEvent, EventStatus } from '@dots/shared';

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Entwurf',
  pending_review: 'Zur Prüfung',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
  rejected: 'Abgelehnt',
};

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
