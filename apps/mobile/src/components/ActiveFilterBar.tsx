import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CATEGORIES,
  QUICK_FILTERS,
  SORT_OPTIONS,
  type QuickFilterId,
  type SortId,
} from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { GlassCard } from './GlassCard';

interface Props {
  categorySlug: string | null;
  quickFilters: QuickFilterId[];
  sort: SortId;
  search: string;
  /** Antippen öffnet das Filter-Panel. */
  onPress: () => void;
}

interface Chip {
  key: string;
  label: string;
  color?: string;
}

/**
 * Schlanke „Status-Leiste" (im Glas-Look der TimeTabs, nur viel dünner): zeigt
 * die aktuell gesetzten Filter unauffällig als Mini-Pills auf einen Blick.
 * Rendert nichts, wenn kein Filter aktiv ist.
 */
export function ActiveFilterBar({ categorySlug, quickFilters, sort, search, onPress }: Props) {
  const t = useTheme();

  const chips: Chip[] = [];
  if (search.trim()) chips.push({ key: 'search', label: `„${search.trim()}"` });
  if (categorySlug) {
    const c = CATEGORIES.find((x) => x.slug === categorySlug);
    if (c) chips.push({ key: 'cat', label: c.name, color: c.color });
  }
  quickFilters.forEach((id) => {
    const q = QUICK_FILTERS.find((x) => x.id === id);
    if (q) chips.push({ key: id, label: q.label });
  });
  if (sort !== 'date') {
    const s = SORT_OPTIONS.find((x) => x.id === sort);
    if (s) chips.push({ key: 'sort', label: s.label });
  }

  if (chips.length === 0) return null;

  const shown = chips.slice(0, 4);
  const extra = chips.length - shown.length;

  return (
    <GlassCard radius={t.radius.pill} shadow={false} outerStyle={styles.outer}>
      <Pressable onPress={onPress} style={styles.row} accessibilityLabel="Aktive Filter — antippen zum Ändern">
        <Ionicons name="options-outline" size={12} color={t.colors.textMuted} />
        {shown.map((c) => (
          <View key={c.key} style={[styles.chip, { backgroundColor: t.colors.surfaceElevated }]}>
            {c.color && <View style={[styles.dot, { backgroundColor: c.color }]} />}
            <Text numberOfLines={1} style={[styles.chipText, { color: t.colors.textSecondary }]}>
              {c.label}
            </Text>
          </View>
        ))}
        {extra > 0 && (
          <View style={[styles.chip, { backgroundColor: t.colors.surfaceElevated }]}>
            <Text style={[styles.chipText, { color: t.colors.textMuted }]}>+{extra}</Text>
          </View>
        )}
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11.5, fontWeight: '700', maxWidth: 110 },
});
