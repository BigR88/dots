import { FIXTURE_FRIENDS } from '@dots/shared';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useFriendOverview } from '@/hooks/use-friends';
import { colorFromId } from '@/lib/avatar-color';

export interface FriendChoice {
  id: string;
  name: string;
  color: string;
}

/**
 * Einheitliche Freundesliste (id, name, Farbe) für Auswahl-UIs — live aus
 * `friend_overview`, sonst aus den Fixtures. `guest` markiert Gäste ohne Konto.
 */
export function useFriendChoices(): { friends: FriendChoice[]; guest: boolean } {
  const overview = useFriendOverview();
  const { session, isGuest } = useAuth();
  const guest = isSupabaseConfigured && isGuest && !session;

  const friends: FriendChoice[] = isSupabaseConfigured
    ? (overview.data?.friends ?? []).map((f) => ({ id: f.id, name: f.name, color: colorFromId(f.id) }))
    : FIXTURE_FRIENDS.map((f) => ({ id: f.id, name: f.name, color: f.color }));

  return { friends, guest };
}
