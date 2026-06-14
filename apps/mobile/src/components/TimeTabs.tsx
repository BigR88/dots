import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { TIME_TABS, type TimeTabId } from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { GlassCard } from './GlassCard';

/**
 * Zeit-Tabs als Segmented-Control. Aktives Segment = Marken-Verlauf mit weichem
 * Glow + weißer Schrift; inaktiv ruhig und grau.
 * `compact` = dünner & ohne Außenabstand. `solid` = opake Fläche statt Milchglas
 * (gut lesbar über Karten/Bildern).
 * `separate` = 4 einzelne, schwebende Pillen nebeneinander (kein gemeinsamer
 * Container) — dazwischen bleibt die Karte sichtbar. Minimalistischer Karten-Look.
 */
export function TimeTabs({
  value,
  onChange,
  compact = false,
  solid = false,
  separate = false,
}: {
  value: TimeTabId;
  onChange: (id: TimeTabId) => void;
  compact?: boolean;
  solid?: boolean;
  separate?: boolean;
}) {
  const t = useTheme();
  const pad = compact ? 7 : 9;

  // Variante: einzelne, frei schwebende Pillen (Karte scheint dazwischen durch).
  if (separate) {
    return (
      <View style={styles.chipRow}>
        {TIME_TABS.map((tab) => {
          const active = tab.id === value;
          return (
            <Pressable key={tab.id} onPress={() => onChange(tab.id)}>
              {active ? (
                <View style={glow(t.accent)}>
                  <LinearGradient
                    colors={t.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.chip}>
                    <Text style={styles.chipActiveLabel}>{tab.label}</Text>
                  </LinearGradient>
                </View>
              ) : (
                <View
                  style={[
                    styles.chip,
                    styles.chipSolid,
                    { backgroundColor: t.colors.surface, borderColor: t.colors.border },
                  ]}>
                  <Text style={[styles.chipLabel, { color: t.colors.textSecondary }]}>{tab.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  const inner = (
    <View style={[styles.row, { padding: compact ? 3 : 4, gap: compact ? 3 : 4 }]}>
      {renderTabs()}
    </View>
  );

  function renderTabs() {
    return TIME_TABS.map((tab) => {
      const active = tab.id === value;
      return (
        <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.item}>
          {active ? (
            <View style={glow(t.accent)}>
              <LinearGradient
                colors={t.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.seg, { paddingVertical: pad }]}>
                <Text style={[styles.activeLabel, compact && styles.compactLabel]}>{tab.label}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={[styles.seg, { paddingVertical: pad }]}>
              <Text style={[styles.label, compact && styles.compactLabel, { color: t.colors.textSecondary }]}>
                {tab.label}
              </Text>
            </View>
          )}
        </Pressable>
      );
    });
  }

  if (solid) {
    return (
      <View
        style={[
          styles.solid,
          { backgroundColor: t.colors.surface, borderColor: t.colors.border },
          compact ? null : styles.container,
        ]}>
        {inner}
      </View>
    );
  }

  return (
    <GlassCard radius={t.radius.pill} shadow={false} outerStyle={compact ? undefined : styles.container}>
      {inner}
    </GlassCard>
  );
}

const glow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 6px 14px ${color}59`, borderRadius: 999 } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
      borderRadius: 999,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  container: { marginHorizontal: 16 },
  solid: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 6px 18px rgba(17,24,39,0.12)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#1F2A44',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      },
    }),
  },
  row: { flexDirection: 'row' },
  item: { flex: 1 },
  seg: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  label: { fontSize: 13.5, fontWeight: '700' },
  activeLabel: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
  compactLabel: { fontSize: 12.5 },
  // „separate"-Variante: einzelne Pillen mit Lücken (Karte scheint durch).
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipSolid: {
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(17,24,39,0.14)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#1F2A44',
        shadowOpacity: 0.14,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
    }),
  },
  chipLabel: { fontSize: 12.5, fontWeight: '700' },
  chipActiveLabel: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
});
