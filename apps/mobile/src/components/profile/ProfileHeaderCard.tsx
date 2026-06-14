import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/theme';
import { GradientAvatar } from './GradientAvatar';
import { ProfileStats, type StatItem } from './ProfileStats';

interface Props {
  name: string;
  username: string;
  email?: string | null;
  bio?: string | null;
  seed: string;
  stats: StatItem[];
  onEdit: () => void;
  onShare: () => void;
}

/**
 * Großer Profil-Kopf als Liquid-Glass-Card: prominenter Gradient-Avatar, Name,
 * eindeutiger @username, dezente E-Mail, optionale Bio und Premium-Stats.
 */
export function ProfileHeaderCard({ name, username, email, bio, seed, stats, onEdit, onShare }: Props) {
  const t = useTheme();
  return (
    <GlassCard style={styles.card} radius={t.radius.xl}>
      <View style={styles.top}>
        <GradientAvatar name={name} seed={seed} size={78} onPress={onEdit} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
            {name}
          </Text>
          <Text numberOfLines={1} style={[styles.username, { color: t.accent }]}>
            @{username}
          </Text>
          {email ? (
            <Text numberOfLines={1} style={[styles.email, { color: t.colors.textMuted }]}>
              {email}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onShare}
          hitSlop={6}
          accessibilityLabel="Profil teilen"
          style={({ pressed }) => [
            styles.shareBtn,
            { backgroundColor: t.colors.surfaceElevated, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] },
          ]}>
          <Ionicons name="share-outline" size={18} color={t.colors.textPrimary} />
        </Pressable>
      </View>

      {bio ? <Text style={[styles.bio, { color: t.colors.textSecondary }]}>{bio}</Text> : null}

      <Pressable
        onPress={onEdit}
        accessibilityLabel="Profil bearbeiten"
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: t.colors.surfaceElevated, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}>
        <Ionicons name="create-outline" size={16} color={t.colors.textPrimary} />
        <Text style={[styles.editText, { color: t.colors.textPrimary }]}>Profil bearbeiten</Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
      <ProfileStats items={stats} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  username: { fontSize: 14.5, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 1 },
  shareBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bio: { fontSize: 14, lineHeight: 20 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 14,
  },
  editText: { fontSize: 14.5, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 2 },
});
