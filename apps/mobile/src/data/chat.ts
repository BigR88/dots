import type { ChatMessage } from '@/lib/chat-store';
import { supabase } from './supabase';

/**
 * Live-Chat über die `messages`-Tabelle (Schema 0003) inkl. Realtime.
 *
 * Geteilte Events werden ohne extra Spalte in `body` kodiert (Sentinel-Prefix),
 * damit kein weiteres Migrations-/Schema-Update nötig ist. RLS sorgt dafür, dass
 * nur Beteiligte lesen und nur an angenommene Freunde gesendet werden kann.
 */

const EVENT_PREFIX = 'dots:event:';

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToMessage(row: any, myId: string): ChatMessage {
  const body = String(row.body ?? '');
  const isEvent = body.startsWith(EVENT_PREFIX);
  return {
    id: row.id,
    fromMe: row.sender_id === myId,
    text: isEvent ? undefined : body,
    eventId: isEvent ? body.slice(EVENT_PREFIX.length) : undefined,
    at: row.created_at,
  };
}

const COLS = 'id, sender_id, recipient_id, body, created_at';

/** Kompletter Thread zwischen mir und einer Freund:in, chronologisch. */
export async function fetchThread(myId: string, friendId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select(COLS)
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`,
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToMessage(r, myId));
}

/** Nachricht (Text ODER geteiltes Event) senden; gibt die gespeicherte Zeile zurück. */
export async function sendMessage(
  myId: string,
  friendId: string,
  payload: { text?: string; eventId?: string },
): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const body = payload.eventId ? `${EVENT_PREFIX}${payload.eventId}` : (payload.text ?? '').trim();
  if (!body) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: myId, recipient_id: friendId, body })
    .select(COLS)
    .single();
  if (error) throw error;
  return rowToMessage(data, myId);
}

/**
 * Auf neue eingehende Nachrichten dieser Freund:in hören (Realtime).
 * Eigene gesendete Nachrichten kommen nicht über diesen Filter zurück
 * (recipient = ich), die hängt der Sender selbst optimistisch an.
 */
export function subscribeThread(
  myId: string,
  friendId: string,
  onInsert: (m: ChatMessage) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel(`chat:${myId}:${friendId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myId}` },
      (payload: any) => {
        if (payload.new?.sender_id === friendId) onInsert(rowToMessage(payload.new, myId));
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
