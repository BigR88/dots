import { supabase } from './supabase';

/**
 * Blockieren & Melden (Schema 0008) — App-Store-Pflicht für Apps mit
 * Nutzer-Inhalten (Apple-Guideline 1.2). Blockieren entfernt serverseitig auch
 * die Freundschaft und verhindert neue Anfragen/Nachrichten in beide
 * Richtungen. Ohne Backend (Demo) lösen die Funktionen einfach auf, damit die
 * UI-Flows in der Web-Demo vorführbar bleiben.
 */

export async function blockUser(targetId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('block_user', { target: targetId });
  if (error) throw error;
}

export async function reportUser(targetId: string, reason: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const reporterId = data.user?.id;
  if (!reporterId) throw new Error('Nicht angemeldet.');
  // `user_reports`, nicht `reports` — letztere ist seit 0001 für EVENT-Meldungen.
  const { error } = await supabase
    .from('user_reports')
    .insert({ reporter_id: reporterId, reported_id: targetId, reason });
  if (error) throw error;
}
