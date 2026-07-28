import type { Group } from '@/lib/groups-store';

/**
 * Rechte in einer Gruppe. Admin (Ersteller:in) darf alles; für alle anderen
 * entscheiden die Gruppen-Berechtigungen. So bleibt die Logik an einer Stelle
 * und gilt in Chat wie Details identisch.
 */

export const isGroupAdmin = (group: Group, userId: string): boolean =>
  group.ownerId === userId || group.adminIds.includes(userId);

/** Ersteller:in — kann nicht entfernt oder als Admin abgesetzt werden. */
export const isGroupOwner = (group: Group, userId: string): boolean => group.ownerId === userId;

/** Darf diese Person Nachrichten schreiben? */
export const canWriteInGroup = (group: Group, userId: string): boolean =>
  isGroupAdmin(group, userId) || group.permissions.membersCanWrite;

/** Darf diese Person Mitglieder hinzufügen/entfernen? */
export const canManageMembers = (group: Group, userId: string): boolean =>
  isGroupAdmin(group, userId) || group.permissions.membersCanManage;

/** Nur Admins bearbeiten Name, Beschreibung, Bild und Rechte. */
export const canEditGroupInfo = (group: Group, userId: string): boolean => isGroupAdmin(group, userId);
