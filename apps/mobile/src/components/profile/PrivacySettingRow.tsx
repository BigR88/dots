import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  icon: string;
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** true = noch ohne Server-Durchsetzung (kennzeichnet ehrlich „bald"). */
  upcoming?: boolean;
  /** Beschriftung des „bald"-Tags (für i18n überschreibbar). */
  tagLabel?: string;
}

/** Moderne Settings-Zeile mit Icon-Tile, Erklärtext und schönem Toggle. */
export function PrivacySettingRow({ icon, label, sub, value, onValueChange, upcoming, tagLabel = 'bald' }: Props) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: `${t.accent}14` }]}>
        <Ionicons name={icon as never} size={17} color={t.accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: t.colors.textPrimary }]}>{label}</Text>
          {upcoming && (
            <View style={[styles.tag, { backgroundColor: t.colors.surfaceElevated }]}>
              <Text style={[styles.tagText, { color: t.colors.textMuted }]}>{tagLabel}</Text>
            </View>
          )}
        </View>
        {sub ? <Text style={[styles.sub, { color: t.colors.textSecondary }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.colors.surfaceElevated, true: t.accent }}
        thumbColor="#fff"
        ios_backgroundColor={t.colors.surfaceElevated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '700' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  tagText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  sub: { fontSize: 12.5, lineHeight: 17 },
});
