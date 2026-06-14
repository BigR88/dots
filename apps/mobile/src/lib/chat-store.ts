import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Chat-Speicher (Demo): ein Thread pro Freund:in in AsyncStorage.
 * Eine Nachricht ist Text ODER eine geteilte Event-Karte (eventId).
 * Mit Supabase wird daraus die `messages`-Tabelle (+ event_id-Spalte).
 */

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text?: string;
  /** Geteiltes Event — wird im Chat als antippbare Event-Karte gerendert. */
  eventId?: string;
  at: string; // ISO
}

const keyFor = (friendId: string) => `dots.chat.${friendId}.v1`;

export async function readThread(friendId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(friendId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function appendToThread(
  friendId: string,
  msg: Omit<ChatMessage, 'id' | 'at'>,
): Promise<ChatMessage[]> {
  const current = await readThread(friendId);
  const next: ChatMessage[] = [
    ...current,
    { ...msg, id: `${Date.now()}-${current.length}`, at: new Date().toISOString() },
  ];
  try {
    await AsyncStorage.setItem(keyFor(friendId), JSON.stringify(next));
  } catch {
    // Demo-Modus: Schreibfehler ignorieren.
  }
  return next;
}
