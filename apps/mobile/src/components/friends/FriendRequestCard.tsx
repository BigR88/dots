import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { AvatarRing } from './AvatarRing';

interface Props {
  name: string;
  avatarColor: string;
  subtitle?: string;
  onAccept: () => void;
  onDecline: () => void;
  accepting?: boolean;
  declining?: boolean;
}

/**
 * Freundschaftsanfrage als hervorgehobene Card: Avatar mit Verlaufs-Ring,
 * Name + Zusatz, zwei klare Aktionen — „Annehmen" (CTA) und „Ablehnen" (dezent).
 */
export function FriendRequestCard({
  name,
  avatarColor,
  subtitle = 'Möchte sich mit dir verbinden',
  onAccept,
  onDecline,
  accepting,
  declining,
}: Props) {
  const t = useTheme();
  return (
    <View style={[styles.card, softShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.head}>
        <AvatarRing name={name} color={avatarColor} size={50} variant="gradient" />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
            {name}
          </Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: t.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onAccept}
          disabled={accepting || declining}
          style={({ pressed }) => [styles.btn, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}
          accessibilityLabel={`Anfrage von ${name} annehmen`}>
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={17} color="#fff" />
              <Text style={styles.acceptText}>Annehmen</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={accepting || declining}
          style={({ pressed }) => [
            styles.btn,
            styles.declineBtn,
            { backgroundColor: t.colors.surfaceElevated, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityLabel={`Anfrage von ${name} ablehnen`}>
          {declining ? (
            <ActivityIndicator size="small" color={t.colors.textSecondary} />
          ) : (
            <Text style={[styles.declineText, { color: t.colors.textSecondary }]}>Ablehnen</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(108,92,255,0.10)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#6C5CFF',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 13 },
  acceptText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  declineBtn: { flex: 0.7 },
  declineText: { fontSize: 14.5, fontWeight: '700' },
});
