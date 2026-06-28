import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { TimeStatusFilter, TimeStatusCounts } from '@/lib/map-filters';
import { useTheme } from '@/theme/theme';

const ITEMS: { key: TimeStatusFilter; label: string }[] = [
  { key: 'live', label: 'Jetzt' },
  { key: 'soon', label: 'Bald' },
  { key: 'later', label: 'Später' },
];

/**
 * Schwebende Zeit-Chips für den heutigen Tag: Jetzt / Bald / Später.
 * Single-Select mit Toggle (aktiven Chip erneut tippen = aus); kein „Alle".
 * Aktiv = DOTS-Lila, inaktiv = helle transluzente Pille.
 */
export function TimeFilterChips({
  value,
  counts,
  onChange,
}: {
  value: TimeStatusFilter | null;
  counts: TimeStatusCounts;
  onChange: (next: TimeStatusFilter | null) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.row} pointerEvents="box-none">
      {ITEMS.map(({ key, label }) => {
        const active = value === key;
        const count = counts[key];
        return (
          <Pressable
            key={key}
            onPress={() => onChange(active ? null : key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              floatShadow,
              active
                ? { backgroundColor: t.accent }
                : { backgroundColor: t.colors.cardGlass, borderColor: t.colors.border, borderWidth: StyleSheet.hairlineWidth },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}>
            <Text style={[styles.label, { color: active ? '#fff' : t.colors.textPrimary }]}>{label}</Text>
            {count > 0 && (
              <Text style={[styles.count, { color: active ? 'rgba(255,255,255,0.85)' : t.colors.textMuted }]}>
                {count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: '0 4px 12px rgba(17,17,20,0.14)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  label: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.1 },
  count: { fontSize: 12.5, fontWeight: '800' },
});
