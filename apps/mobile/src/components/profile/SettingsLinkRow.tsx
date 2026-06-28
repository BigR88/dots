import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
}

/**
 * Einstellungs-Zeile, die auf einen eigenen Unter-Screen führt (Drill-down):
 * Icon-Tile, Titel, Erklärtext und Chevron. Bewusst wie {@link PrivacySettingRow},
 * nur mit Pfeil statt Toggle.
 */
export function SettingsLinkRow({ icon, label, sub, onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.iconTile, { backgroundColor: `${t.accent}14` }]}>
        <Ionicons name={icon as never} size={17} color={t.accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: t.colors.textPrimary }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: t.colors.textSecondary }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, lineHeight: 17 },
});
