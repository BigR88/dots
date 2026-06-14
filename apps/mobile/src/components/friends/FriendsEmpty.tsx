import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Schlanke Variante (z. B. leere Anfragen-Sektion). */
  compact?: boolean;
}

/**
 * Minimalistischer, freundlicher Empty State im Karten-Look: weiches Icon-Tile,
 * klarer Titel, optionaler Zusatz + CTA.
 */
export function FriendsEmpty({ icon, title, subtitle, actionLabel, onAction, compact }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border },
      ]}>
      <View style={[styles.iconTile, compact && styles.iconTileCompact, { backgroundColor: `${t.accent}12` }]}>
        <Ionicons name={icon as never} size={compact ? 20 : 26} color={t.accent} />
      </View>
      <View style={[styles.textCol, compact && styles.textColCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact, { color: t.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, compact && styles.subtitleCompact, { color: t.colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.cta, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
  },
  wrapCompact: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  iconTile: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconTileCompact: { width: 38, height: 38, borderRadius: 12 },
  textCol: { flex: 0, alignItems: 'center', gap: 3 },
  textColCompact: { flex: 1, alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2 },
  titleCompact: { fontSize: 14.5, textAlign: 'left' },
  subtitle: { fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  subtitleCompact: { textAlign: 'left' },
  cta: { marginTop: 2, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
