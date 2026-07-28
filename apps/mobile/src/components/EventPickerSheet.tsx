import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/GlassView';
import { SearchBar } from '@/components/friends/SearchBar';
import { listEventsByIds } from '@/data/events';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (eventId: string) => void;
}

/**
 * Event-Auswahl zum Teilen in einen Chat: NUR die eigenen Favoriten (per Herz
 * gespeicherte Events) mit Suchfeld. Inline-Overlay wie FriendPickerModal.
 */
export function EventPickerSheet({ visible, onClose, onPick }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const favoriteIds = useFavoriteIds();
  const ids = useMemo(() => [...favoriteIds].sort(), [favoriteIds]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['event-picker-favorites', ids],
    queryFn: () => listEventsByIds(ids),
    enabled: visible && ids.length > 0,
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = events ?? [];
    if (!needle) return all;
    return all.filter((e) =>
      [e.title, e.venue?.name, e.category?.name].filter(Boolean).join(' ').toLowerCase().includes(needle),
    );
  }, [events, query]);

  if (!visible) return null;

  const noFavorites = ids.length === 0;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Favorit teilen</Text>
        <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>
          Teile ein Event aus deinen Favoriten
        </Text>

        {!noFavorites && (
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Favoriten durchsuchen"
          />
        )}

        {noFavorites ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Du hast noch keine Favoriten. Tippe bei einem Event auf das Herz, um es hier teilen zu können.
          </Text>
        ) : isLoading ? (
          <ActivityIndicator color={t.accent} style={{ paddingVertical: 22 }} />
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            {query.trim() ? `Kein Favorit passt zu „${query.trim()}".` : 'Keine Favoriten verfügbar.'}
          </Text>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((e) => {
              const accent = e.category?.color ?? t.accent;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => onPick(e.id)}
                  accessibilityLabel={`${e.title} teilen`}
                  style={[styles.row, { borderColor: t.colors.border }]}>
                  <View style={[styles.icon, { backgroundColor: `${accent}26` }]}>
                    <Ionicons name={(e.category?.icon ?? 'sparkles') as never} size={18} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
                      {e.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.meta, { color: t.colors.textSecondary }]}>
                      {formatDateTime(e.startAt)} · {e.venue?.name ?? 'Frankfurt'}
                    </Text>
                  </View>
                  <Ionicons name="arrow-up-circle" size={22} color={t.accent} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>Abbrechen</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 18 },
  list: { maxHeight: 320, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 1 },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
