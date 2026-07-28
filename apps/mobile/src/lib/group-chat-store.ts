import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gruppenchat-Speicher (Demo): ein Thread pro Gruppe in AsyncStorage. Eine
 * Nachricht ist Text ODER eine geteilte Event-Karte (eventId). `fromMe`
 * markiert eigene Nachrichten; `senderName`/`senderColor` beschreiben – sobald
 * ein Backend existiert – die anderen Mitglieder für Absender-Label + Avatar.
 * Mit Supabase wird daraus `group_messages` (+ Realtime).
 */

export interface GroupChatMessage {
  id: string;
  fromMe: boolean;
  senderName?: string;
  senderColor?: string;
  text?: string;
  eventId?: string;
  at: string; // ISO
}

const keyFor = (groupId: string) => `dots.groupchat.${groupId}.v1`;

export async function readGroupThread(groupId: string): Promise<GroupChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(groupId));
    return raw ? (JSON.parse(raw) as GroupChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function appendToGroupThread(
  groupId: string,
  msg: Omit<GroupChatMessage, 'id' | 'at'>,
): Promise<GroupChatMessage[]> {
  const current = await readGroupThread(groupId);
  const next: GroupChatMessage[] = [
    ...current,
    { ...msg, id: `${Date.now()}-${current.length}`, at: new Date().toISOString() },
  ];
  try {
    await AsyncStorage.setItem(keyFor(groupId), JSON.stringify(next));
  } catch {
    // Demo-Modus: Schreibfehler ignorieren.
  }
  return next;
}
