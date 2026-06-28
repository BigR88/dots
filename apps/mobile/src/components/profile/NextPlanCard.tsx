import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme/theme';

interface Props {
  event: DotsEvent | null;
  onOpen: (id: string) => void;
  onDiscover: () => void;
}

/**
 * „Aktuelle Pläne": nächstes Event, zu dem zugesagt wurde. Ohne Zusage ein
 * freundlicher Platzhalter, der zum Entdecken einlädt. Leichtes Scale-Feedback.
 */
export function NextPlanCard({ event, onOpen, onDiscover }: Props) {
  const t = useTheme();

  if (!event) {
    return (
      <Pressable
        onPress={onDiscover}
        style={({ pressed }) => [
          styles.card,
          softShadow,
          { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}>
        <View style={[styles.iconTile, { backgroundColor: `${t.accent}14` }]}>
          <Ionicons name="sparkles" size={20} color={t.accent} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Dein Plan</Text>
          <Text style={[styles.sub, { color: t.colors.textSecondary }]}>
            Dein perfekter Event Plan
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
      </Pressable>
    );
  }

  const color = event.category?.color ?? t.accent;
  return (
    <Pressable
      onPress={() => onOpen(event.id)}
      style={({ pressed }) => [
        styles.card,
        softShadow,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}>
      <View style={[styles.iconTile, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={(event.category?.icon ?? 'calendar') as never} size={20} color={color} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: t.colors.textPrimary }]}>
          {event.title}
        </Text>
        <Text numberOfLines={1} style={[styles.sub, { color: t.colors.textSecondary }]}>
          {formatDateTime(event.startAt)}
          {event.venue?.name ? ` · ${event.venue.name}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
    </Pressable>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 6px 20px rgba(17,24,39,0.06)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  iconTile: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  sub: { fontSize: 13 },
});
