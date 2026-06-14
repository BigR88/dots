import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { CATEGORIES, QUICK_FILTERS, type QuickFilterId } from '@dots/shared';
import { useTheme } from '@/theme/theme';

interface Props {
  categorySlug: string | null;
  quickFilters: QuickFilterId[];
  onToggleCategory: (slug: string) => void;
  onToggleQuick: (id: QuickFilterId) => void;
}

/** Filter als ruhige, rahmenlose Chips — aktiv = Ink, inaktiv = Surface. */
export function FilterChips({ categorySlug, quickFilters, onToggleCategory, onToggleQuick }: Props) {
  const t = useTheme();

  const Chip = ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: t.radius.pill,
          backgroundColor: active ? t.accent : t.colors.surface,
        },
      ]}>
      <Ionicons name={icon as never} size={13} color={active ? '#fff' : t.colors.textMuted} />
      <Text style={[styles.label, { color: active ? '#fff' : t.colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {QUICK_FILTERS.map((q) => (
        <Chip
          key={q.id}
          label={q.label}
          icon={q.icon}
          active={quickFilters.includes(q.id)}
          onPress={() => onToggleQuick(q.id)}
        />
      ))}
      {CATEGORIES.map((c) => (
        <Chip
          key={c.slug}
          label={c.name}
          icon={c.icon}
          active={categorySlug === c.slug}
          onPress={() => onToggleCategory(c.slug)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  label: { fontSize: 13.5, fontWeight: '600' },
});
