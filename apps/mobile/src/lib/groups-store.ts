import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gruppen-Speicher (Demo): Gruppen lokal in AsyncStorage. Eine Gruppe hat Name,
 * Beschreibung, Profilbild, Ersteller:in (Admin), Mitglieder (eigene Freund:innen)
 * und Berechtigungen. Mit Supabase wird daraus `groups` (+ `group_members` mit
 * Rolle) und die Rechte werden per RLS erzwungen.
 */

/** Demo-Selbst-ID (Ersteller:in). Live ist das die eigene User-ID. */
export const OWNER_SELF = 'me';

export interface GroupPermissions {
  /** Dürfen Nicht-Admins Nachrichten schreiben? */
  membersCanWrite: boolean;
  /** Dürfen Nicht-Admins Mitglieder hinzufügen/entfernen? */
  membersCanManage: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  /** Profilbild als URI/data-URL (nur Admins bearbeiten es). */
  avatarUri?: string;
  /** Ersteller:in = Admin (immer). */
  ownerId: string;
  /** IDs der Mitglieder — immer aus der eigenen Freundesliste. */
  memberIds: string[];
  /** Mitglieder mit Admin-Rechten (dürfen schreiben & Mitglieder verwalten). */
  adminIds: string[];
  /** Basis-Rechte für Nicht-Admin-Mitglieder. */
  permissions: GroupPermissions;
  createdAt: string; // ISO
}

const KEY = 'dots.groups.v1';

/** Bei neuen Gruppen dürfen zunächst alle Mitglieder schreiben & verwalten. */
const DEFAULT_PERMISSIONS: GroupPermissions = { membersCanWrite: true, membersCanManage: true };

/** Alt-Datensätze (ohne neue Felder) auf das aktuelle Schema heben. */
function normalize(g: Partial<Group> & { id: string; name: string }): Group {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    avatarUri: g.avatarUri,
    ownerId: g.ownerId ?? OWNER_SELF,
    memberIds: g.memberIds ?? [],
    adminIds: g.adminIds ?? [],
    permissions: {
      membersCanWrite: g.permissions?.membersCanWrite ?? DEFAULT_PERMISSIONS.membersCanWrite,
      membersCanManage: g.permissions?.membersCanManage ?? DEFAULT_PERMISSIONS.membersCanManage,
    },
    createdAt: g.createdAt ?? new Date().toISOString(),
  };
}

export async function readGroups(): Promise<Group[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Group[]).map(normalize) : [];
  } catch {
    return [];
  }
}

export async function getGroup(id: string): Promise<Group | null> {
  return (await readGroups()).find((g) => g.id === id) ?? null;
}

async function writeGroups(groups: Group[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(groups));
  } catch {
    // Demo-Modus: Schreibfehler ignorieren.
  }
}

export async function createGroup(name: string, memberIds: string[]): Promise<Group[]> {
  const current = await readGroups();
  const group: Group = {
    id: `g-${Date.now()}`,
    name: name.trim(),
    description: '',
    ownerId: OWNER_SELF,
    memberIds,
    adminIds: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    createdAt: new Date().toISOString(),
  };
  const next = [group, ...current];
  await writeGroups(next);
  return next;
}

/** Änderbare Felder einer Gruppe (Name, Beschreibung, Bild, Mitglieder, Rechte). */
export type GroupPatch = Partial<
  Pick<Group, 'name' | 'description' | 'avatarUri' | 'memberIds' | 'adminIds'>
> & {
  permissions?: Partial<GroupPermissions>;
};

export async function updateGroup(id: string, patch: GroupPatch): Promise<Group[]> {
  const next = (await readGroups()).map((g) =>
    g.id === id
      ? {
          ...g,
          ...patch,
          permissions: { ...g.permissions, ...(patch.permissions ?? {}) },
        }
      : g,
  );
  await writeGroups(next);
  return next;
}

/**
 * Gruppe verlassen. Demo: entfernt die Gruppe aus dem lokalen Bestand (die
 * einzige Kopie hier). Mit Backend wird stattdessen nur die eigene
 * Mitgliedschaft entfernt — die Gruppe bleibt für die anderen bestehen.
 */
export async function leaveGroup(id: string): Promise<Group[]> {
  const next = (await readGroups()).filter((g) => g.id !== id);
  await writeGroups(next);
  return next;
}
