import type { DotsEvent } from '@dots/shared';

/** Tonalität eines Badges → steuert die Farbe in der UI. */
export type BadgeTone = 'time' | 'free' | 'age' | 'hot';

export interface EventBadge {
  label: string;
  tone: BadgeTone;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Leitet die Card-Badges eines Events aus seinen Daten ab:
 * Heute / Morgen / Wochenende (Zeit), Kostenlos, 18+, Beliebt.
 * Reine Ableitung, kein State — die App-Logik bleibt unberührt.
 */
export function eventBadges(e: DotsEvent, opts?: { trending?: boolean }): EventBadge[] {
  const out: EventBadge[] = [];

  const start = new Date(e.startAt);
  if (!Number.isNaN(start.getTime())) {
    const today = startOfDay(new Date());
    const diffDays = Math.round((startOfDay(start).getTime() - today.getTime()) / 86_400_000);
    const dow = start.getDay(); // 0 = So … 6 = Sa
    if (diffDays === 0) out.push({ label: 'Heute', tone: 'time' });
    else if (diffDays === 1) out.push({ label: 'Morgen', tone: 'time' });
    else if (diffDays >= 0 && diffDays <= 7 && (dow === 5 || dow === 6 || dow === 0)) {
      out.push({ label: 'Wochenende', tone: 'time' });
    }
  }

  if (e.priceType === 'free') out.push({ label: 'Kostenlos', tone: 'free' });
  if (e.ageRestriction != null && e.ageRestriction >= 18) out.push({ label: '18+', tone: 'age' });
  if (opts?.trending) out.push({ label: 'Beliebt', tone: 'hot' });

  return out;
}
