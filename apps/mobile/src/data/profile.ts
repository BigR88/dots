import { supabase } from './supabase';

/**
 * Eigenes Profil lesen/schreiben (Tabelle `profiles`, RLS: self_read/self_write).
 *
 * Robust gegen „Migration 0005 noch nicht eingespielt": `select('*')` liefert nur
 * vorhandene Spalten, fehlende Felder werden zu null/[]. Schreibt nur gesetzte
 * Felder; schlägt ein Schreibvorgang fehl (Spalte fehlt), wird der Fehler oben
 * sauber angezeigt statt die App zu sprengen.
 */
export interface MyProfile {
  id: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  interests: string[];
  homeArea: string | null;
}

export interface ProfilePatch {
  displayName?: string;
  username?: string | null;
  bio?: string | null;
  interests?: string[];
  homeArea?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as any;
  return {
    id: r.id,
    displayName: r.display_name ?? null,
    username: r.username ?? null,
    bio: r.bio ?? null,
    interests: Array.isArray(r.interests) ? r.interests : [],
    homeArea: r.home_area ?? null,
  };
}

export async function updateMyProfile(userId: string, patch: ProfilePatch): Promise<void> {
  if (!supabase) return;
  const row: Record<string, unknown> = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.homeArea !== undefined) row.home_area = patch.homeArea;

  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) throw error;

  // Anzeigename zusätzlich in den Auth-Metadaten spiegeln → useAuth bleibt app-
  // weit konsistent (Begrüßung, Fallbacks etc.).
  if (patch.displayName !== undefined) {
    await supabase.auth.updateUser({ data: { name: patch.displayName } }).catch(() => undefined);
  }
}

/** true = frei, false = vergeben, null = unbekannt (RPC fehlt → Migration offen). */
export async function checkUsernameAvailable(candidate: string): Promise<boolean | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('username_available', { candidate });
  if (error) return null;
  return Boolean(data);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
