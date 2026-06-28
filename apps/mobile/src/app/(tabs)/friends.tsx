import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXTURE_FRIENDS, type DemoFriend, type DotsEvent } from '@dots/shared';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendsEmpty } from '@/components/friends/FriendsEmpty';
import { FriendsHeader } from '@/components/friends/FriendsHeader';
import { SearchBar } from '@/components/friends/SearchBar';
import { SectionHeader } from '@/components/friends/SectionHeader';
import { ScreenGradient } from '@/components/ScreenGradient';
import { listEventsByIds } from '@/data/events';
import { isSupabaseConfigured } from '@/data/supabase';
import type { FriendProfile } from '@/data/friends';
import { useFriendOverview, useFriendsAttendance } from '@/hooks/use-friends';
import { colorFromId } from '@/lib/avatar-color';
import { useTheme } from '@/theme/theme';

const matches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

export default function FriendsScreen() {
  return isSupabaseConfigured ? <LiveFriends /> : <DemoFriends />;
}

// ── Live: echte Freunde über Supabase ───────────────────────────────────────
function LiveFriends() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);

  // Suche filtert NUR die bestehende Freundesliste (lokal, kein Backend-Call).
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const overview = useFriendOverview();
  const attendance = useFriendsAttendance();

  const friends = overview.data?.friends ?? [];
  const incoming = overview.data?.incoming ?? [];

  // Events, zu denen Freunde zugesagt haben (einmal laden, dann pro Freund filtern).
  const eventIds = useMemo(
    () => [...new Set((attendance.data ?? []).map((r) => r.eventId))],
    [attendance.data],
  );
  const { data: friendEvents } = useQuery({
    queryKey: ['friend-events', eventIds],
    queryFn: () => listEventsByIds(eventIds),
    enabled: eventIds.length > 0,
  });
  const eventsById = useMemo(
    () => new Map((friendEvents ?? []).map((e) => [e.id, e])),
    [friendEvents],
  );
  const eventsForFriend = (friendId: string): DotsEvent[] =>
    (attendance.data ?? [])
      .filter((r) => r.userId === friendId)
      .map((r) => eventsById.get(r.eventId))
      .filter((e): e is DotsEvent => Boolean(e));

  const filtered = friends.filter((f) => matches(f.name, deferredQuery));

  const openChat = (u: FriendProfile) =>
    router.push({
      pathname: '/chat/[friendId]',
      params: { friendId: u.id, name: u.name, color: colorFromId(u.id) },
    });

  const openProfile = (u: FriendProfile) =>
    router.push({
      pathname: '/friend/[id]',
      params: { id: u.id, name: u.name, color: colorFromId(u.id) },
    });

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top }]}>
      <ScreenGradient />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={overview.isFetching && !overview.isLoading}
            onRefresh={() => overview.refetch()}
            tintColor={t.accent}
          />
        }>
        <FriendsHeader
          subtitle="Wer geht wohin?"
          onAction={() => router.push('/add-friends')}
          actionLabel="Anfragen & Freunde finden"
          actionBadge={incoming.length}
        />

        {friends.length > 0 && (
          <SearchBar
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Freunde suchen"
          />
        )}

        <View style={styles.section}>
          <SectionHeader title="Deine Freunde" count={friends.length} />
          {overview.isLoading ? (
            <ActivityIndicator color={t.accent} style={{ paddingVertical: 18 }} />
          ) : friends.length === 0 ? (
            <FriendsEmpty
              icon="people-outline"
              title="Noch keine Freund:innen"
              subtitle="Suche nach Freund:innen und verbinde dich für gemeinsame Events."
              actionLabel="Freunde finden"
              onAction={() => router.push('/add-friends')}
            />
          ) : filtered.length === 0 ? (
            <FriendsEmpty
              compact
              icon="search-outline"
              title="Keine Treffer"
              subtitle={`Niemand in deiner Liste heißt „${deferredQuery.trim()}".`}
            />
          ) : (
            <View style={styles.grid}>
              {filtered.map((f) => (
                <View key={f.id} style={styles.cell}>
                  <FriendCard
                    name={f.name}
                    avatarColor={colorFromId(f.id)}
                    events={eventsForFriend(f.id)}
                    onChat={() => openChat(f)}
                    onOpenProfile={() => openProfile(f)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Demo: Fixtures (kein Backend) ───────────────────────────────────────────
function DemoFriends() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const allIds = [...new Set(FIXTURE_FRIENDS.flatMap((f) => f.attending))];
  const { data: events } = useQuery({
    queryKey: ['friend-events', allIds],
    queryFn: () => listEventsByIds(allIds),
  });

  const goingFor = (friend: DemoFriend): DotsEvent[] =>
    (events ?? []).filter((e) => friend.attending.includes(e.id));

  const filtered = FIXTURE_FRIENDS.filter((f) => matches(f.name, deferredQuery));

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top }]}>
      <ScreenGradient />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <FriendsHeader
          subtitle="Wer geht wohin?"
          onAction={() => router.push('/add-friends')}
          actionLabel="Anfragen & Freunde finden"
        />

        <SearchBar
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Freunde suchen"
        />

        <View style={styles.section}>
          <SectionHeader title="Deine Freunde" count={FIXTURE_FRIENDS.length} />
          {filtered.length === 0 ? (
            <FriendsEmpty
              compact
              icon="search-outline"
              title="Keine Treffer"
              subtitle={`Niemand in deiner Liste heißt „${deferredQuery.trim()}".`}
            />
          ) : (
            <View style={styles.grid}>
              {filtered.map((friend) => (
                <View key={friend.id} style={styles.cell}>
                  <FriendCard
                    name={friend.name}
                    avatarColor={friend.color}
                    events={goingFor(friend)}
                    onChat={() => router.push(`/chat/${friend.id}`)}
                    onOpenProfile={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  section: { marginTop: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%' },
});
