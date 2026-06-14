import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

export interface StatItem {
  label: string;
  value: number;
  icon: string;
  onPress?: () => void;
}

/**
 * Premium-Stats-Reihe (Favoriten / Zusagen / Freunde): große Zahl, kleines Label,
 * dezentes Icon. Klickbar mit leichtem Scale-Feedback, getrennt durch Hairlines.
 */
export function ProfileStats({ items }: { items: StatItem[] }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      {items.map((s, i) => (
        <Pressable
          key={s.label}
          onPress={s.onPress}
          disabled={!s.onPress}
          style={({ pressed }) => [
            styles.stat,
            i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.colors.border },
            { opacity: pressed && s.onPress ? 0.6 : 1, transform: [{ scale: pressed && s.onPress ? 0.97 : 1 }] },
          ]}>
          <View style={styles.valueRow}>
            <Ionicons name={s.icon as never} size={13} color={t.accent} />
            <Text style={[styles.value, { color: t.colors.textPrimary }]}>{s.value}</Text>
          </View>
          <Text style={[styles.label, { color: t.colors.textSecondary }]}>{s.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  value: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  label: { fontSize: 12, fontWeight: '600' },
});
