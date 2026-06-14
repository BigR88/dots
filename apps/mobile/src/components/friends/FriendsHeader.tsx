import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  subtitle?: string;
  /** Kleine Statuszeile (z. B. Demo-Hinweis). */
  note?: string;
  /** Optionale Aktion oben rechts (z. B. „Freund:innen finden"). */
  onAction?: () => void;
  actionIcon?: string;
  actionLabel?: string;
  /** Zähler-Badge am Action-Button (z. B. offene Anfragen). */
  actionBadge?: number;
}

/**
 * Großer, ruhiger Kopf der Freunde-Seite: „Freunde." mit Brand-Dot + Unterzeile,
 * rechts ein dezenter runder Action-Button (z. B. Suche fokussieren).
 */
export function FriendsHeader({
  subtitle = 'Bleib mit deinen Leuten verbunden',
  note,
  onAction,
  actionIcon = 'person-add',
  actionLabel = 'Freund:innen finden',
  actionBadge = 0,
}: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>
          Freunde<Text style={{ color: t.accent }}>.</Text>
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
        {note ? <Text style={[styles.note, { color: t.colors.textMuted }]}>{note}</Text> : null}
      </View>

      {onAction && (
        <View>
          <Pressable
            onPress={onAction}
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [
              styles.action,
              softShadow,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}>
            <Ionicons name={actionIcon as never} size={20} color={t.accent} />
          </Pressable>
          {actionBadge > 0 && (
            <View pointerEvents="none" style={[styles.badge, { backgroundColor: t.accent, borderColor: t.colors.background }]}>
              <Text style={styles.badgeText}>{actionBadge > 9 ? '9+' : actionBadge}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 4px 14px rgba(17,24,39,0.06)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 14 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.9 },
  subtitle: { fontSize: 14, marginTop: 2 },
  note: { fontSize: 11, marginTop: 3 },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

