import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { ScreenGradient } from '@/components/ScreenGradient';
import { ScreenHeader } from '@/components/ScreenHeader';
import { listEventsByIds } from '@/data/events';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useTheme } from '@/theme/theme';

export default function FavoritesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const favoriteIds = useFavoriteIds();
  const ids = [...favoriteIds].sort();

  const { data } = useQuery({
    queryKey: ['favorites', ids],
    queryFn: () => listEventsByIds(ids),
  });
  const events = data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top }]}>
      <ScreenGradient />
      <ScreenHeader
        title="Favoriten"
        subtitle={
          ids.length === 0
            ? 'Deine gespeicherten Events'
            : `${ids.length} gespeicherte${ids.length === 1 ? 's' : ''} Event${ids.length === 1 ? '' : 's'}`
        }
      />

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Noch keine Favoriten"
            subtitle="Tippe auf das Herz bei einem Event, um es hier zu speichern — direkt auf der Karte in der Liste oder im Detail."
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
          events.length === 0 && styles.emptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  emptyGrow: { flexGrow: 1, justifyContent: 'center' },
});
