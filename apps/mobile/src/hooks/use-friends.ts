import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FIXTURE_FRIENDS } from '@dots/shared';
import {
  acceptFriendRequest,
  fetchFriendOverview,
  fetchFriendsAttendance,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
  type FriendOverview,
} from '@/data/friends';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';
import { colorFromId } from '@/lib/avatar-color';

export interface EventFriend {
  id: string;
  name: string;
  color: string;
}

const EMPTY_OVERVIEW: FriendOverview = { friends: [], incoming: [], outgoing: [] };

/** Freunde + offene Anfragen (live). */
export function useFriendOverview() {
  return useQuery({
    queryKey: ['friend-overview'],
    queryFn: fetchFriendOverview,
    enabled: isSupabaseConfigured,
  });
}

/** Zusagen aller eigenen Freunde (eine geteilte Query). */
export function useFriendsAttendance() {
  const overview = useFriendOverview();
  const ids = (overview.data?.friends ?? []).map((f) => f.id).sort();
  return useQuery({
    queryKey: ['friends-attendance', ids],
    queryFn: () => fetchFriendsAttendance(ids),
    enabled: isSupabaseConfigured && ids.length > 0,
    staleTime: 30_000,
  });
}

/** Welche Freunde gehen zu einem bestimmten Event (für Social-Proof-Zeilen). */
export function useFriendsAttendingEvent(eventId: string): EventFriend[] {
  const overview = useFriendOverview();
  const rows = useFriendsAttendance();

  if (!isSupabaseConfigured) {
    return FIXTURE_FRIENDS.filter((f) => f.attending.includes(eventId)).map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
    }));
  }

  const nameById = new Map((overview.data?.friends ?? []).map((f) => [f.id, f.name]));
  return (rows.data ?? [])
    .filter((r) => r.eventId === eventId)
    .map((r) => ({ id: r.userId, name: nameById.get(r.userId) ?? 'Freund:in', color: colorFromId(r.userId) }));
}

/** Suche nach Nutzer:innen zum Hinzufügen (ab 2 Zeichen). */
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ['user-search', query.trim()],
    queryFn: () => searchUsers(query),
    enabled: isSupabaseConfigured && query.trim().length >= 2,
    staleTime: 10_000,
  });
}

/** Aktionen (anfragen/annehmen/entfernen) inkl. Cache-Invalidierung. */
export function useFriendActions() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const myId = session?.user?.id ?? null;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['friend-overview'] });
    void qc.invalidateQueries({ queryKey: ['friends-attendance'] });
    void qc.invalidateQueries({ queryKey: ['user-search'] });
  };

  const request = useMutation({
    mutationFn: (targetId: string) => sendFriendRequest(myId ?? '', targetId),
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: (friendshipId: string) => acceptFriendRequest(friendshipId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (friendshipId: string) => removeFriendship(friendshipId),
    onSuccess: invalidate,
  });

  return { request, accept, remove, canAct: Boolean(myId) };
}
