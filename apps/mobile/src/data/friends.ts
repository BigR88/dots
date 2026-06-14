import { supabase } from './supabase';

/**
 * Supabase-Anbindung des Freunde-Systems (Schema 0003 + RPCs aus 0004).
 *
 * Namen kommen aus den SECURITY-DEFINER-RPCs `search_users` / `friend_overview`
 * (die `profiles`-Tabelle bleibt sonst self-read). Aktionen laufen direkt über
 * die `friendships`-Policies: anfragen (insert), annehmen (update),
 * ablehnen/zurückziehen/entfernen (delete).
 */

export interface FriendProfile {
  id: string;
  name: string;
  /** Eindeutiger @handle (ab Migration 0005; vorher undefined). */
  username?: string;
}

export interface FriendRequest {
  friendshipId: string;
  user: FriendProfile;
}

export interface FriendOverview {
  friends: FriendProfile[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

const EMPTY_OVERVIEW: FriendOverview = { friends: [], incoming: [], outgoing: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function searchUsers(query: string): Promise<FriendProfile[]> {
  if (!supabase || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_users', { q: query.trim() });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.display_name ?? 'Gast',
    username: r.username ?? undefined,
  }));
}

export async function fetchFriendOverview(): Promise<FriendOverview> {
  if (!supabase) return EMPTY_OVERVIEW;
  const { data, error } = await supabase.rpc('friend_overview');
  if (error) throw error;
  const ov: FriendOverview = { friends: [], incoming: [], outgoing: [] };
  for (const r of (data ?? []) as any[]) {
    const user: FriendProfile = { id: r.other_id, name: r.display_name ?? 'Gast' };
    if (r.direction === 'friend') ov.friends.push(user);
    else if (r.direction === 'incoming') ov.incoming.push({ friendshipId: r.friendship_id, user });
    else ov.outgoing.push({ friendshipId: r.friendship_id, user });
  }
  return ov;
}

export async function sendFriendRequest(myId: string, targetId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: targetId, status: 'pending' });
  if (error) throw error;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

/** Anfrage ablehnen / zurückziehen / Freundschaft beenden (löscht die Zeile). */
export async function removeFriendship(friendshipId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

/** Zusagen aller Freunde (RLS: nur Freunde/eigene sichtbar). */
export async function fetchFriendsAttendance(
  friendIds: string[],
): Promise<{ eventId: string; userId: string }[]> {
  if (!supabase || friendIds.length === 0) return [];
  const { data, error } = await supabase
    .from('event_attendance')
    .select('event_id, user_id')
    .in('user_id', friendIds);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ eventId: r.event_id, userId: r.user_id }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
