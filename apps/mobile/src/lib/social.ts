import { FIXTURE_FRIENDS, type DemoFriend } from '@dots/shared';
import { isSupabaseConfigured } from '@/data/supabase';

/**
 * Freund:innen-Bezüge für die Social-Proof-Zeilen.
 *
 * Im Demo-Modus stammen sie aus den Fixtures. Mit Supabase verbunden gibt es
 * noch keine echten Freundschaften (das Freunde-Feature folgt) — daher liefern
 * wir live bewusst leere Listen, statt Demo-Namen vorzutäuschen. Die echten
 * Zähler kommen ohnehin aus `event_trending` (siehe use-attendee-count).
 */

export function friendsAttending(eventId: string): DemoFriend[] {
  if (isSupabaseConfigured) return [];
  return FIXTURE_FRIENDS.filter((f) => f.attending.includes(eventId));
}

export function friendById(id: string): DemoFriend | null {
  return FIXTURE_FRIENDS.find((f) => f.id === id) ?? null;
}
