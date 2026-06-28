import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXTURE_FRIENDS } from '@dots/shared';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { GlassCard } from '@/components/GlassCard';
import { GradientAvatar } from '@/components/profile/GradientAvatar';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { SectionLabel } from '@/components/profile/SectionLabel';
import { listEventsByIds } from '@/data/events';
import { fetchFriendsAttendance } from '@/data/friends';
import { isSupabaseConfigured } from '@/data/supabase';
import { colorFromId } from '@/lib/avatar-color';
import { sortByStartAsc } from '@/lib/event-sort';
import { friendById } from '@/lib/social';
import { useTheme } from '@/theme/theme';

/**
 * Freundes-Profil — zeigt (ähnlich zum eigenen Profil) Favoriten, Zusagen und
 * Freunde der Person. Hierher gelangt man über Bild/Name in der Freundesliste.
 *
 * Demo-Modus: Daten aus den Fixtures. Mit Supabase verbunden kommen die Zusagen
 * aus `event_attendance`; Favoriten/Freunde einer anderen Person sind (noch)
 * nicht abrufbar und bleiben daher leer.
 */
export default function FriendProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { id, name, color } = useLocalSearchParams<{ id: string; name?: string; color?: string }>();
  const friendId = String(id);
  const demo = friendById(friendId);

  const displayName = demo?.name ?? (name ? String(name) : 'Freund:in');
  const avatarColor = demo?.color ?? (color ? String(color) : colorFromId(friendId));

  // Zusagen-IDs: Demo aus Fixtures, sonst live aus event_attendance.
  const live = useQuery({
    queryKey: ['friend-attendance', friendId],
    queryFn: () => fetchFriendsAttendance([friendId]),
    enabled: isSupabaseConfigured && !demo,
  });
  const attendingIds = demo?.attending ?? (live.data ?? []).map((r) => r.eventId);
  const favoriteIds = demo?.favorites ?? [];

  const { data: attendingRaw } = useQuery({
    queryKey: ['friend-attending-events', friendId, attendingIds],
    queryFn: () => listEventsByIds(attendingIds),
    enabled: attendingIds.length > 0,
  });
  const { data: favoriteRaw } = useQuery({
    queryKey: ['friend-favorite-events', friendId, favoriteIds],
    queryFn: () => listEventsByIds(favoriteIds),
    enabled: favoriteIds.length > 0,
  });

  const attending = useMemo(() => sortByStartAsc(attendingRaw ?? []), [attendingRaw]);
  const favorites = useMemo(() => sortByStartAsc(favoriteRaw ?? []), [favoriteRaw]);
  // Demo: alle anderen Demo-Freunde gelten als Freunde dieser Person.
  const friends = useMemo(() => FIXTURE_FRIENDS.filter((f) => f.id !== friendId), [friendId]);
  const friendsCount = isSupabaseConfigured && !demo ? 0 : friends.length;

  const openMessage = () =>
    router.push({
      pathname: '/chat/[friendId]',
      params: { friendId, name: displayName, color: avatarColor },
    });

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${t.accent}1F`, `${t.accentBlue}0A`, 'transparent']}
        style={[styles.bgGradient, { height: insets.top + 260 }]}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        {/* Kopfzeile mit Zurück */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
            hitSlop={8}
            accessibilityLabel="Zurück"
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons name="chevron-back" size={22} color={t.colors.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Profil</Text>
        </View>

        {/* Profil-Card (ähnlich zum eigenen Profil) */}
        <GlassCard style={styles.profileCard} radius={t.radius.xl}>
          <View style={styles.profileTop}>
            <GradientAvatar name={displayName} seed={friendId} size={78} />
            <View style={styles.identity}>
              <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
                {displayName}
              </Text>
              <Text numberOfLines={1} style={[styles.handle, { color: t.accent }]}>
                Freund:in
              </Text>
            </View>
            <Pressable
              onPress={openMessage}
              hitSlop={6}
              accessibilityLabel={`Mit ${displayName} schreiben`}
              style={({ pressed }) => [
                styles.msgBtn,
                { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
          <ProfileStats
            items={[
              { label: 'Favoriten', value: favorites.length, icon: 'heart' },
              { label: 'Zusagen', value: attending.length, icon: 'checkmark-circle' },
              { label: 'Freunde', value: friendsCount, icon: 'people' },
            ]}
          />
        </GlassCard>

        {/* Zusagen — alle Events, zu denen die Person geht */}
        <View style={styles.section}>
          <SectionLabel title="Zusagen" hint="Events, zu denen sie geht" />
          {attending.length > 0 ? (
            attending.map((e) => (
              <EventCard key={e.id} event={e} onPress={() => router.push(`/event/${e.id}`)} />
            ))
          ) : (
            <EmptyState icon="calendar-outline" title="Noch keine Zusagen" />
          )}
        </View>

        {/* Favoriten */}
        <View style={styles.section}>
          <SectionLabel title="Favoriten" hint="Was sie sich gemerkt hat" />
          {favorites.length > 0 ? (
            favorites.map((e) => (
              <EventCard key={e.id} event={e} onPress={() => router.push(`/event/${e.id}`)} />
            ))
          ) : (
            <EmptyState icon="heart-outline" title="Noch keine Favoriten" />
          )}
        </View>

        {/* Freunde */}
        <View style={styles.section}>
          <SectionLabel title="Freunde" />
          {friends.length > 0 ? (
            <View style={styles.friendList}>
              {friends.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push({ pathname: '/friend/[id]', params: { id: f.id } })}
                  style={({ pressed }) => [
                    styles.friendRow,
                    { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}>
                  <Avatar name={f.name} color={f.color} size={38} />
                  <Text numberOfLines={1} style={[styles.friendName, { color: t.colors.textPrimary }]}>
                    {f.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState icon="people-outline" title="Keine gemeinsamen Freunde" />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  profileCard: { padding: 18, gap: 14 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  handle: { fontSize: 14.5, fontWeight: '700' },
  msgBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 2 },
  section: { marginTop: 24 },
  friendList: { gap: 10 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  friendName: { flex: 1, fontSize: 15.5, fontWeight: '700' },
});
