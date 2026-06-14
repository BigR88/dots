import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Supabase-Anbindung des Social-Kerns: „Bin dabei"-Zusagen, Zusagen-Zähler &
 * Trend-Signal. Liest die globalen Aggregate aus der View `event_trending`
 * (zählt alle Nutzer, ist anon lesbar) und schreibt Zusagen in
 * `event_attendance` (RLS: nur die eigene Zeile). Schema: 0003_social.sql.
 */

export interface SocialStats {
  /** eventId → Anzahl Zusagen (global). */
  counts: Record<string, number>;
  /** eventId → Trend-Score (Zusagen×5 + Klicks/7T). */
  trend: Record<string, number>;
}

const EMPTY_STATS: SocialStats = { counts: {}, trend: {} };

/** Aggregierte Social-Kennzahlen aller veröffentlichten Events (eine Abfrage). */
export async function fetchSocialStats(): Promise<SocialStats> {
  if (!supabase) return EMPTY_STATS;
  const { data, error } = await supabase
    .from('event_trending')
    .select('event_id, attendees, trend_score');
  if (error) throw error;
  const stats: SocialStats = { counts: {}, trend: {} };
  for (const row of data ?? []) {
    stats.counts[row.event_id] = Number(row.attendees ?? 0);
    stats.trend[row.event_id] = Number(row.trend_score ?? 0);
  }
  return stats;
}

/** Event-IDs, zu denen der Nutzer zugesagt hat. */
export async function fetchMyAttendance(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('event_attendance')
    .select('event_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.event_id as string);
}

/** Zusage setzen oder zurücknehmen. */
export async function setAttendance(
  userId: string,
  eventId: string,
  attending: boolean,
): Promise<void> {
  if (!supabase) return;
  if (attending) {
    const { error } = await supabase
      .from('event_attendance')
      .upsert({ event_id: eventId, user_id: userId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .match({ event_id: eventId, user_id: userId });
    if (error) throw error;
  }
}

/** Detail-Aufruf als Trend-Signal loggen (anonym erlaubt, Fehler verschluckt). */
export async function logEventClick(userId: string | null, eventId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  await supabase
    .from('event_clicks')
    .insert({ event_id: eventId, user_id: userId })
    .then(undefined, () => undefined);
}
