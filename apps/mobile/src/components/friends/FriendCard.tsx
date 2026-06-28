import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { AvatarRing } from './AvatarRing';
import { MessageButton } from './MessageButton';

interface Props {
  name: string;
  avatarColor: string;
  /** Events, zu denen die Person zugesagt hat (nur für die Anzahl im Status). */
  events: DotsEvent[];
  onChat: () => void;
  /** Öffnet das Profil der Person (Tap auf die Karte). Dort gibt es das nächste Event. */
  onOpenProfile: () => void;
}

/**
 * Kompakte Freund:innen-Card fürs 2-Spalten-Raster: zentrierter Avatar, Name und
 * Zusage-Anzahl, dezenter Anschreiben-Button oben rechts. Tippen öffnet das
 * Profil — das nächste Event ist bewusst erst dort sichtbar.
 */
export function FriendCard({ name, avatarColor, events, onChat, onOpenProfile }: Props) {
  const t = useTheme();
  const going = events.length;
  const status = going === 0 ? 'Keine Zusagen' : `${going} Event${going === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={onOpenProfile}
      accessibilityLabel={`Profil von ${name} öffnen`}
      style={({ pressed }) => [
        styles.card,
        softShadow,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {/* Anschreiben — oben rechts, eigener Tap (öffnet nicht das Profil) */}
      <View style={styles.msgWrap}>
        <MessageButton onPress={onChat} accessibilityLabel={`Mit ${name} schreiben`} />
      </View>

      <AvatarRing name={name} color={avatarColor} size={56} variant="soft" />
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
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 9,
  },
  msgWrap: { position: 'absolute', top: 8, right: 8 },
  name: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', maxWidth: '100%' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 12.5, flexShrink: 1 },
});
