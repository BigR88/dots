import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { TimeStatusFilter, TimeStatusCounts } from '@/lib/map-filters';
import { useTheme } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const ITEMS: { key: TimeStatusFilter; label: string }[] = [
  { key: 'live', label: 'Jetzt' },
  { key: 'soon', label: 'Bald' },
  { key: 'later', label: 'Später' },
];

/**
 * Schwebende Zeit-Chips für den heutigen Tag: Jetzt / Bald / Später.
 * Single-Select mit Toggle (aktiven Chip erneut tippen = aus); kein „Alle".
 * Aktiv = DOTS-Lila mit kurzem Puls; inaktiv = dezente Glas-Pille.
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
  return (
    <View style={styles.row} pointerEvents="box-none">
      {ITEMS.map(({ key, label }) => (
        <Chip
          key={key}
          label={label}
          count={counts[key]}
          active={value === key}
          onPress={() => onChange(value === key ? null : key)}
        />
      ))}
    </View>
  );
}

function Chip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  // Einmaliger Puls beim Aktivieren — fühlbares Feedback ohne Gimmick.
  useEffect(() => {
    if (!active) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 130, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(pulse, { toValue: 1, bounciness: 8, speed: 16, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [active, pulse]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.chip,
            active ? activeShadow : floatShadow,
            active
              ? { backgroundColor: t.accent }
              : { backgroundColor: t.colors.cardGlass, borderColor: t.colors.border, borderWidth: StyleSheet.hairlineWidth },
            { transform: [{ scale: pressed ? 0.95 : pulse }] },
          ]}>
          <Text style={[styles.label, { color: active ? '#fff' : t.colors.textPrimary }]}>{label}</Text>
          {count > 0 && (
            <Text style={[styles.count, { color: active ? 'rgba(255,255,255,0.85)' : t.colors.textMuted }]}>
              {count}
            </Text>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: '0 3px 10px rgba(17,17,20,0.12)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
}) as ViewStyle;

const activeShadow = Platform.select({
  web: { boxShadow: '0 6px 16px rgba(108,92,255,0.45)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#6C5CFF',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.1 },
  count: { fontSize: 12, fontWeight: '800' },
});
