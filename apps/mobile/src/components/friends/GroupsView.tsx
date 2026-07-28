import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { CreateGroupSheet } from '@/components/friends/CreateGroupSheet';
import { GroupAvatar } from '@/components/friends/GroupAvatar';
import { FriendsEmpty } from '@/components/friends/FriendsEmpty';
import { FriendsHeader } from '@/components/friends/FriendsHeader';
import { SectionHeader } from '@/components/friends/SectionHeader';
import { ScreenGradient } from '@/components/ScreenGradient';
import { useFriendChoices } from '@/hooks/use-friend-choices';
import { useGroups } from '@/hooks/use-groups';
import type { Group } from '@/lib/groups-store';
import { useTheme } from '@/theme/theme';

/**
 * Gruppen-Menü: bestehende Gruppen auflisten und neue erstellen. Mitglieder
 * sind ausschließlich eigene Freund:innen (siehe CreateGroupSheet). Aufbau
 * bewusst wie der Freunde-Tab (Header + Sektion + Karten).
 */
export function GroupsView({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groups, loading, create } = useGroups();
  const { friends } = useFriendChoices();
  const [creating, setCreating] = useState(false);

  // Mitglieds-IDs → Freund:in auflösen (für Avatare & Namen in den Karten).
  const friendById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top }]}>
      <ScreenGradient />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}>
        <FriendsHeader
          title="gruppen."
          subtitle="Plant gemeinsam mit euren Crews"
          onBack={onBack}
          onAction={() => setCreating(true)}
          actionIcon="add"
          actionLabel="Gruppe erstellen"
        />

        <View style={styles.section}>
          <SectionHeader title="Deine Gruppen" count={groups.length} />
          {loading ? (
            <ActivityIndicator color={t.accent} style={{ paddingVertical: 18 }} />
          ) : groups.length === 0 ? (
            <FriendsEmpty
              icon="albums-outline"
              title="Noch keine Gruppen"
              subtitle="Erstelle eine Gruppe mit deinen Freund:innen und entdeckt gemeinsam Events."
              actionLabel="Gruppe erstellen"
              onAction={() => setCreating(true)}
            />
          ) : (
            <View style={styles.grid}>
              {groups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  friendById={friendById}
                  onOpen={() => router.push(`/group/${g.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateGroupSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreate={(name, memberIds) => {
          void create(name, memberIds);
          setCreating(false);
        }}
      />
    </View>
  );
}

function GroupCard({
  group,
  friendById,
  onOpen,
}: {
  group: Group;
  friendById: Map<string, { id: string; name: string; color: string }>;
  onOpen: () => void;
}) {
  const t = useTheme();
  const members = group.memberIds.map((id) => friendById.get(id)).filter(Boolean) as {
    id: string;
    name: string;
    color: string;
  }[];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={`Gruppenchat ${group.name} öffnen`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={styles.cardHead}>
        <GroupAvatar name={group.name} uri={group.avatarUri} size={38} />
      </View>

      <Text numberOfLines={1} style={[styles.cardTitle, { color: t.colors.textPrimary }]}>
        {group.name}
      </Text>

      <View style={styles.avatars}>
        {members.slice(0, 4).map((m, i) => (
          <View key={m.id} style={[styles.avatarWrap, i > 0 && { marginLeft: -10 }]}>
            <Avatar name={m.name} color={m.color} size={30} />
          </View>
        ))}
        {members.length > 4 && (
          <View style={[styles.moreWrap, { backgroundColor: t.colors.surfaceElevated, borderColor: t.colors.surface }]}>
            <Text style={[styles.moreText, { color: t.colors.textSecondary }]}>+{members.length - 4}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.cardMeta, { color: t.colors.textSecondary }]}>
        {group.memberIds.length} {group.memberIds.length === 1 ? 'Mitglied' : 'Mitglieder'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  section: { marginTop: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderRadius: 16 },
  moreWrap: {
    marginLeft: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontSize: 11, fontWeight: '800' },
  cardMeta: { fontSize: 12.5, fontWeight: '600' },
});
