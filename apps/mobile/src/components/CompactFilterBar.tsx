import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, QUICK_FILTERS, type QuickFilterId } from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { GlassCard } from './GlassCard';

interface Props {
  categorySlug: string | null;
  quickFilters: QuickFilterId[];
  search: string;
  open: boolean;
  onPress: () => void;
}

interface Chip {
  key: string;
  label: string;
  color?: string;
}

/**
 * Schlanke, schwebende Filter-Leiste für die Karte. Zeigt „Filtern & Suchen"
 * oder — wenn aktiv — die gesetzten Filter als Mini-Pills. Antippen öffnet das
 * Filter-Panel. Bewusst sehr platzsparend, damit die Karte dominiert.
 */
export function CompactFilterBar({ categorySlug, quickFilters, search, open, onPress }: Props) {
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

  return (
    <Pressable onPress={onPress} accessibilityLabel="Filtern & Suchen">
      <GlassCard radius={t.radius.pill} style={styles.bar}>
        <Ionicons name="options-outline" size={16} color={t.accent} />
        {chips.length === 0 ? (
          <Text style={[styles.label, { color: t.colors.textPrimary }]}>Filtern & Suchen</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroll}>
            {chips.map((c) => (
              <View key={c.key} style={[styles.chip, { backgroundColor: t.colors.surfaceElevated }]}>
                {c.color && <View style={[styles.dot, { backgroundColor: c.color }]} />}
                <Text numberOfLines={1} style={[styles.chipText, { color: t.colors.textSecondary }]}>
                  {c.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={t.colors.textMuted} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  label: { flex: 1, fontSize: 14, fontWeight: '700' },
  chipScroll: { flex: 1 },
  chips: { alignItems: 'center', gap: 6, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11.5, fontWeight: '700', maxWidth: 120 },
});
