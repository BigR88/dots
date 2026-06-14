import { useQuery } from '@tanstack/react-query';
import type { DotsEvent } from '@dots/shared';
import { fetchSocialStats, type SocialStats } from '@/data/social';
import { isSupabaseConfigured } from '@/data/supabase';
import { friendsAttending } from '@/lib/social';
import { useIsAttending } from './use-attendance';

/**
 * Geteilte Social-Kennzahlen (Zusagen-Zähler & Trend-Score) für alle Events.
 * Eine einzige Query je App-Instanz — React Query dedupliziert über alle Cards.
 */
export function useSocialStats() {
  return useQuery<SocialStats>({
    queryKey: ['social-stats'],
    queryFn: fetchSocialStats,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}

// Demo-Zähler: Basis aus Beliebtheit + Freunde + ggf. ich selbst.
function demoCount(event: DotsEvent, isAttending: boolean): number {
  const base = Math.max(2, Math.round(event.popularityScore * 0.4));
  return base + friendsAttending(event.id).length + (isAttending ? 1 : 0);
}

/** Anzahl „Bin dabei"-Zusagen für ein Event (live aus Supabase, sonst Demo). */
export function useAttendeeCount(event: DotsEvent): number {
  const isAttending = useIsAttending(event.id);
  const stats = useSocialStats();
  if (!isSupabaseConfigured) return demoCount(event, isAttending);
  return stats.data?.counts[event.id] ?? 0;
}
