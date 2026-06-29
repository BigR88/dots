import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { GradientText } from '@/components/GradientText';
import { EventCard } from '@/components/EventCard';
import { ScreenGradient } from '@/components/ScreenGradient';
import { listEventsByIds } from '@/data/events';
import { useAttendingIds } from '@/hooks/use-attendance';
import { sortByStartAsc } from '@/lib/event-sort';
import { useTheme } from '@/theme/theme';

/**
 * „Deine Pläne" — alle Events, zu denen man selbst zugesagt hat (eigene
 * Zusagen). Erreichbar über die „Dein Plan"-Karte im Profil.
 */
export default function PlansScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const attending = useAttendingIds();
  const ids = [...attending].sort();

  const { data } = useQuery({
    queryKey: ['my-plans', ids],
    queryFn: () => listEventsByIds(ids),
    enabled: ids.length > 0,
  });
  const events = sortByStartAsc(data ?? []);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      <ScreenGradient />

      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          hitSlop={8}
          accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <GradientText style={styles.title}>Deine Pläne.</GradientText>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Noch keine Zusagen"
            subtitle="Sag bei einem Event zu — es erscheint dann hier in deinen Plänen."
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          events.length === 0 && styles.emptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  emptyGrow: { flexGrow: 1, justifyContent: 'center' },
});
