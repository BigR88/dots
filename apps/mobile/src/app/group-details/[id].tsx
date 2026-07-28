import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { AddMembersSheet } from '@/components/friends/AddMembersSheet';
import { GroupAvatar } from '@/components/friends/GroupAvatar';
import { MemberActionsSheet, type MemberTarget } from '@/components/friends/MemberActionsSheet';
import { useAuth } from '@/hooks/use-auth';
import { useFriendChoices } from '@/hooks/use-friend-choices';
import { canEditGroupInfo, canManageMembers, isGroupAdmin } from '@/lib/group-perms';
import { OWNER_SELF, getGroup, leaveGroup, updateGroup, type GroupPatch } from '@/lib/groups-store';
import { pickImageDataUrl } from '@/lib/pick-image';
import { palette, useTheme } from '@/theme/theme';

/**
 * Gruppen-Details: Mitglieder ansehen/verwalten, Name/Beschreibung/Bild
 * bearbeiten und (als Admin) einstellen, was Mitglieder dürfen. Rechte kommen
 * zentral aus group-perms; geschrieben wird lokal (Demo) mit Cache-Invalidierung.
 */
export default function GroupDetailsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { session } = useAuth();
  const myId = session?.user?.id ?? OWNER_SELF;

  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { friends } = useFriendChoices();
  const memberById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [activeMember, setActiveMember] = useState<MemberTarget | null>(null);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['group', groupId] }),
      qc.invalidateQueries({ queryKey: ['groups'] }),
    ]);

  const apply = async (patch: GroupPatch) => {
    await updateGroup(groupId, patch);
    await refresh();
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <EmptyState icon="people-outline" title="Gruppe nicht gefunden" />
      </View>
    );
  }

  const admin = isGroupAdmin(group, myId);
  const manage = canManageMembers(group, myId);
  const editInfo = canEditGroupInfo(group, myId);

  const startEdit = () => {
    setNameDraft(group.name);
    setDescDraft(group.description);
    setEditing(true);
  };
  const saveEdit = async () => {
    const name = nameDraft.trim();
    if (!name) return;
    await apply({ name, description: descDraft.trim() });
    setEditing(false);
  };

  const changeAvatar = async () => {
    if (!editInfo || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const uri = await pickImageDataUrl();
      if (uri) await apply({ avatarUri: uri });
    } finally {
      setAvatarBusy(false);
    }
  };

  const addMembers = async (ids: string[]) => {
    setAddOpen(false);
    await apply({ memberIds: [...group.memberIds, ...ids] });
  };
  const removeMember = async (mid: string) => {
    setActiveMember(null);
    await apply({
      memberIds: group.memberIds.filter((x) => x !== mid),
      adminIds: group.adminIds.filter((x) => x !== mid),
    });
  };
  const toggleAdmin = async (mid: string, makeAdmin: boolean) => {
    const adminIds = makeAdmin
      ? [...new Set([...group.adminIds, mid])]
      : group.adminIds.filter((x) => x !== mid);
    setActiveMember((prev) => (prev ? { ...prev, isAdmin: makeAdmin } : prev));
    await apply({ adminIds });
  };

  const leave = async () => {
    await leaveGroup(groupId);
    await refresh();
    router.replace('/friends');
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Kopf */}
      <View style={[styles.topbar, { paddingTop: insets.top + 8, borderBottomColor: t.colors.border }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
          hitSlop={8}
          accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.colors.textPrimary }]}>Gruppen-Info</Text>
        {editInfo ? (
          editing ? (
            <Pressable onPress={saveEdit} hitSlop={8} accessibilityLabel="Speichern">
              <Text style={[styles.save, { color: t.accent }]}>Speichern</Text>
            </Pressable>
          ) : (
            <Pressable onPress={startEdit} hitSlop={8} accessibilityLabel="Bearbeiten">
              <Ionicons name="create-outline" size={22} color={t.accent} />
            </Pressable>
          )
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Profilbild + Name + Beschreibung */}
        <View style={styles.hero}>
          <Pressable onPress={changeAvatar} disabled={!editInfo} accessibilityLabel="Profilbild ändern">
            <GroupAvatar name={group.name} uri={group.avatarUri} size={96} />
            {editInfo && (
              <View style={[styles.cameraBadge, { backgroundColor: t.accent, borderColor: t.colors.background }]}>
                {avatarBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={15} color="#fff" />
                )}
              </View>
            )}
          </Pressable>

          {editing ? (
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Gruppenname"
              placeholderTextColor={t.colors.textMuted}
              style={[
                styles.nameInput,
                { color: t.colors.textPrimary, backgroundColor: t.colors.surface, borderColor: t.colors.border },
              ]}
            />
          ) : (
            <Text style={[styles.name, { color: t.colors.textPrimary }]}>{group.name}</Text>
          )}

          {editing ? (
            <TextInput
              value={descDraft}
              onChangeText={setDescDraft}
              placeholder="Beschreibung (optional)"
              placeholderTextColor={t.colors.textMuted}
              multiline
              style={[
                styles.descInput,
                { color: t.colors.textPrimary, backgroundColor: t.colors.surface, borderColor: t.colors.border },
              ]}
            />
          ) : group.description ? (
            <Text style={[styles.desc, { color: t.colors.textSecondary }]}>{group.description}</Text>
          ) : (
            <Text style={[styles.descMuted, { color: t.colors.textMuted }]}>
              {editInfo ? 'Beschreibung hinzufügen (Stift oben rechts)' : 'Keine Beschreibung'}
            </Text>
          )}
        </View>

        {/* Admin-Einstellungen */}
        {admin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.colors.textSecondary }]}>ADMIN-EINSTELLUNGEN</Text>
            <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
              <PermRow
                label="Mitglieder dürfen schreiben"
                value={group.permissions.membersCanWrite}
                onValueChange={(v) => void apply({ permissions: { membersCanWrite: v } })}
              />
              <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
              <PermRow
                label="Mitglieder dürfen Mitglieder verwalten"
                value={group.permissions.membersCanManage}
                onValueChange={(v) => void apply({ permissions: { membersCanManage: v } })}
              />
            </View>
          </View>
        )}

        {/* Mitglieder */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: t.colors.textSecondary }]}>
              MITGLIEDER · {group.memberIds.length + 1}
            </Text>
            {manage && (
              <Pressable onPress={() => setAddOpen(true)} hitSlop={8} style={styles.addLink}>
                <Ionicons name="person-add" size={16} color={t.accent} />
                <Text style={[styles.addLinkText, { color: t.accent }]}>Hinzufügen</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            {/* Admin-Zeile (Ersteller:in) */}
            <View style={styles.memberRow}>
              <Avatar name="Du" color={palette.accent} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: t.colors.textPrimary }]}>
                  {group.ownerId === myId ? 'Du' : 'Ersteller:in'}
                </Text>
                <Text style={[styles.memberSub, { color: t.colors.textMuted }]}>Erstellt die Gruppe</Text>
              </View>
              <View style={[styles.adminBadge, { backgroundColor: `${t.accent}1A` }]}>
                <Text style={[styles.adminBadgeText, { color: t.accent }]}>Admin</Text>
              </View>
            </View>

            {group.memberIds.map((mid) => {
              const m = memberById.get(mid);
              const name = m?.name ?? 'Unbekannt';
              const color = m?.color ?? palette.accentMuted;
              const memberIsAdmin = group.adminIds.includes(mid);
              const open = () =>
                manage && setActiveMember({ id: mid, name, color, isAdmin: memberIsAdmin });
              return (
                <View key={mid}>
                  <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
                  <Pressable
                    onPress={open}
                    disabled={!manage}
                    accessibilityLabel={manage ? `${name} verwalten` : name}
                    style={({ pressed }) => [styles.memberRow, pressed && manage && { opacity: 0.6 }]}>
                    <Avatar name={name} color={color} size={38} />
                    <Text style={[styles.memberName, { flex: 1, color: t.colors.textPrimary }]}>{name}</Text>
                    {memberIsAdmin && (
                      <View style={[styles.adminBadge, { backgroundColor: `${t.accent}1A` }]}>
                        <Text style={[styles.adminBadgeText, { color: t.accent }]}>Admin</Text>
                      </View>
                    )}
                    {manage && (
                      <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text style={[styles.hint, { color: t.colors.textMuted }]}>
            {manage
              ? 'Tippe ein Mitglied an, um es zum Admin zu machen oder zu entfernen.'
              : 'Nur Admins können Mitglieder verwalten.'}
          </Text>
        </View>

        {/* Gruppe verlassen — erscheint erst im Bearbeiten-Modus */}
        {editing && (
          <Pressable
            onPress={leave}
            style={[styles.deleteBtn, { borderColor: t.colors.border }]}
            accessibilityLabel="Gruppe verlassen">
            <Ionicons name="exit-outline" size={18} color={palette.danger} />
            <Text style={[styles.deleteText, { color: palette.danger }]}>Gruppe verlassen</Text>
          </Pressable>
        )}
      </ScrollView>

      <AddMembersSheet
        visible={addOpen}
        existingIds={group.memberIds}
        onClose={() => setAddOpen(false)}
        onAdd={addMembers}
      />

      <MemberActionsSheet
        member={activeMember}
        onClose={() => setActiveMember(null)}
        onToggleAdmin={(mid, makeAdmin) => void toggleAdmin(mid, makeAdmin)}
        onRemove={(mid) => void removeMember(mid)}
      />
    </View>
  );
}

function PermRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.permRow}>
      <Text style={[styles.permLabel, { color: t.colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.colors.border, true: t.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  save: { fontSize: 15.5, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  hero: { alignItems: 'center', gap: 10, paddingBottom: 8 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  nameInput: {
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: { fontSize: 14.5, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
  descMuted: { fontSize: 13.5, textAlign: 'center' },
  descInput: {
    alignSelf: 'stretch',
    minHeight: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    textAlignVertical: 'top',
  },
  section: { marginTop: 18, gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addLinkText: { fontSize: 13.5, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14 },
  permLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  memberName: { fontSize: 15.5, fontWeight: '700' },
  memberSub: { fontSize: 12, marginTop: 1 },
  adminBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  adminBadgeText: { fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 12.5, lineHeight: 17, paddingHorizontal: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  deleteText: { fontSize: 15, fontWeight: '800' },
});
