import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { nextUpcoming } from '@/lib/event-sort';
import { useTheme } from '@/theme/theme';
import { AvatarRing } from './AvatarRing';
import { MessageButton } from './MessageButton';

interface Props {
  name: string;
  avatarColor: string;
  /** Events, zu denen die Person zugesagt hat (für Status + nächstes Event). */
  events: DotsEvent[];
  onChat: () => void;
  onOpenEvent: (id: string) => void;
  /** Öffnet das Profil der Person (Tap auf Bild/Name). */
  onOpenProfile: () => void;
}

/**
 * Hochwertige Freund:innen-Card: Avatar mit feinem Ring, Name + Status,
 * dezenter Anschreiben-Button. Zeigt nur das **nächste** Event — alle weiteren
 * Events gibt es im Profil (Tap auf Bild/Name).
 */
export function FriendCard({ name, avatarColor, events, onChat, onOpenEvent, onOpenProfile }: Props) {
  const t = useTheme();
  const going = events.length;
  const next = nextUpcoming(events);
  const status =
    going === 0 ? 'Noch keine Zusagen' : `Geht zu ${going} Event${going === 1 ? '' : 's'}`;

  return (
    <View style={[styles.card, softShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.head}>
        {/* Bild + Name öffnen das Profil */}
        <Pressable
          onPress={onOpenProfile}
          accessibilityLabel={`Profil von ${name} öffnen`}
          style={({ pressed }) => [styles.identityTap, pressed && { opacity: 0.6 }]}>
          <AvatarRing name={name} color={avatarColor} size={50} variant="soft" />
          <View style={styles.identity}>
            <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
              {name}
            </Text>
            <View style={styles.statusRow}>
              <Ionicons
                name={going > 0 ? 'calendar' : 'ellipse-outline'}
                size={12}
                color={going > 0 ? t.accent : t.colors.textMuted}
              />
              <Text numberOfLines={1} style={[styles.status, { color: t.colors.textSecondary }]}>
                {status}
              </Text>
            </View>
          </View>
        </Pressable>
        <MessageButton onPress={onChat} accessibilityLabel={`Mit ${name} schreiben`} />
      </View>

      {next && (
        <View style={styles.events}>
          <Text style={[styles.nextLabel, { color: t.colors.textMuted }]}>Als Nächstes</Text>
          <Pressable
            onPress={() => onOpenEvent(next.id)}
            style={({ pressed }) => [
              styles.eventChip,
              { backgroundColor: t.colors.background, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={[styles.eventIcon, { backgroundColor: `${next.category?.color ?? t.accent}1F` }]}>
              <Ionicons
                name={(next.category?.icon ?? 'sparkles') as never}
                size={13}
                color={next.category?.color ?? t.accent}
              />
            </View>
            <Text numberOfLines={1} style={[styles.eventText, { color: t.colors.textPrimary }]}>
              {next.title}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
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
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, gap: 3 },
  name: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 13, flexShrink: 1 },
  events: { gap: 7 },
  nextLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 2 },
  eventChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 9 },
  eventIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  eventText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
});
