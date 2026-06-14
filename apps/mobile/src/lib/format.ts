import type { DotsEvent } from '@dots/shared';

const dayFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)} Uhr`;
}

// Kompakte Preis-Anzeige fürs Badge.
export function formatPrice(e: Pick<DotsEvent, 'priceType' | 'priceMin' | 'priceMax' | 'currency'>): string {
  if (e.priceType === 'free') return 'Free';
  if (e.priceType === 'donation') return 'Spende';
  if (e.priceType === 'unknown') return '–';
  const sym = e.currency === 'EUR' ? '€' : e.currency;
  if (e.priceMin != null && e.priceMax != null && e.priceMax !== e.priceMin) {
    return `${e.priceMin}–${e.priceMax} ${sym}`;
  }
  if (e.priceMin != null) return `ab ${e.priceMin} ${sym}`;
  return sym;
}

export function isFree(e: Pick<DotsEvent, 'priceType'>): boolean {
  return e.priceType === 'free' || e.priceType === 'donation';
}

export function isUnder20(e: Pick<DotsEvent, 'priceType' | 'priceMin'>): boolean {
  if (e.priceType === 'free' || e.priceType === 'donation') return true;
  return e.priceMin != null && e.priceMin < 20;
}
