import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDeferredValue, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddButton } from '@/components/friends/AddButton';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { FriendsEmpty } from '@/components/friends/FriendsEmpty';
import { SearchBar } from '@/components/friends/SearchBar';
import { SectionHeader } from '@/components/friends/SectionHeader';
import { UserRow } from '@/components/friends/UserRow';
import { useFriendActions, useFriendOverview, useUserSearch } from '@/hooks/use-friends';
import { colorFromId } from '@/lib/avatar-color';
import { useTheme } from '@/theme/theme';

/**
 * „Freunde finden" — eigene Seite (Stack-Route über den Tabs): neue Nutzer:innen
 * suchen & hinzufügen, eingehende Anfragen annehmen/ablehnen, gesendete Anfragen
 * sehen/zurückziehen. Nutzt dieselben Hooks/Logik wie zuvor — nur ausgelagert.
 */
export default function AddFriendsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const overview = useFriendOverview();
  const search = useUserSearch(deferredQuery);
  const { request, accept, remove } = useFriendActions();

  const incoming = overview.data?.incoming ?? [];
  const outgoing = overview.data?.outgoing ?? [];

  const searching = deferredQuery.trim().length >= 2;
  const results = (search.data ?? []).filter((u) => !outgoing.some((o) => o.user.id === u.id));

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header mit Zurück-Button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
          hitSlop={8}
          accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.colors.textPrimary }]}>Freunde finden</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <SearchBar
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Per Name oder @username finden …"
        />

        {/* Suchergebnisse */}
        {searching && (
          <View style={styles.section}>
            <SectionHeader title="Suchergebnisse" />
            {search.isLoading ? (
              <ActivityIndicator color={t.accent} style={{ paddingVertical: 14 }} />
            ) : results.length === 0 ? (
              <FriendsEmpty
                compact
                icon="search-outline"
                title="Niemand gefunden"
                subtitle="Der Name muss mit dem Konto übereinstimmen."
              />
            ) : (
              <View style={styles.sectionBody}>
                {results.map((u) => (
                  <UserRow
                    key={u.id}
                    name={u.name}
                    avatarColor={colorFromId(u.id)}
                    subtitle={u.username ? `@${u.username}` : undefined}>
                    <AddButton
                      busy={request.isPending && request.variables === u.id}
                      onPress={() => request.mutate(u.id)}
                    />
                  </UserRow>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Anfragen */}
        <View style={styles.section}>
          <SectionHeader title="Anfragen" count={incoming.length} />
          {incoming.length === 0 ? (
            <FriendsEmpty
              compact
              icon="mail-open-outline"
              title="Keine offenen Anfragen"
              subtitle="Neue Freundschaftsanfragen erscheinen hier."
            />
          ) : (
            <View style={styles.sectionBody}>
              {incoming.map((req) => (
                <FriendRequestCard
                  key={req.friendshipId}
                  name={req.user.name}
                  avatarColor={colorFromId(req.user.id)}
                  onAccept={() => accept.mutate(req.friendshipId)}
                  onDecline={() => remove.mutate(req.friendshipId)}
                  accepting={accept.isPending && accept.variables === req.friendshipId}
                  declining={remove.isPending && remove.variables === req.friendshipId}
                />
              ))}
            </View>
          )}
        </View>

        {/* Gesendet */}
        {outgoing.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Gesendet" count={outgoing.length} />
            <View style={styles.sectionBody}>
              {outgoing.map((req) => (
                <UserRow
                  key={req.friendshipId}
                  name={req.user.name}
                  avatarColor={colorFromId(req.user.id)}
                  subtitle="Anfrage gesendet">
                  <View style={[styles.pendingPill, { backgroundColor: t.colors.surfaceElevated }]}>
                    <Text style={[styles.pendingText, { color: t.colors.textMuted }]}>Ausstehend</Text>
                  </View>
                  <Pressable
                    onPress={() => remove.mutate(req.friendshipId)}
                    hitSlop={8}
                    accessibilityLabel="Anfrage zurückziehen">
                    <Ionicons name="close-circle-outline" size={20} color={t.colors.textMuted} />
                  </Pressable>
                </UserRow>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  content: { paddingHorizontal: 16, paddingTop: 6 },
  section: { marginTop: 22 },
  sectionBody: { gap: 10 },
  pendingPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9 },
  pendingText: { fontSize: 12.5, fontWeight: '700' },
});
