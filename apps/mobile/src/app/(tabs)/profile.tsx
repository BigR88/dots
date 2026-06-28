import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXTURE_FRIENDS } from '@dots/shared';
import { NextPlanCard } from '@/components/profile/NextPlanCard';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { listEventsByIds } from '@/data/events';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAttendingIds } from '@/hooks/use-attendance';
import { useAuth } from '@/hooks/use-auth';
import { pickAvatar, useAvatar } from '@/hooks/use-avatar';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useFriendOverview } from '@/hooks/use-friends';
import { useMyProfile } from '@/hooks/use-profile';
import { suggestUsername } from '@/lib/username';
import { useTheme } from '@/theme/theme';

export default function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { displayName, email } = useAuth();

  const profile = useMyProfile();
  const avatar = useAvatar();
  const favorites = useFavoriteIds();
  const attending = useAttendingIds();
  const overview = useFriendOverview();

  const name = profile.data?.displayName ?? displayName ?? 'Benas Gibson';
  const username =
    profile.data?.username ??
    (displayName || email ? suggestUsername(displayName, email) : 'dots.developer');
  const bio = profile.data?.bio ?? null;
  const seed = profile.data?.id ?? name;

  const friendsCount = isSupabaseConfigured
    ? overview.data?.friends.length ?? 0
    : FIXTURE_FRIENDS.length;

  // Nächstes Event aus den eigenen Zusagen.
  const attendingIds = useMemo(() => [...attending], [attending]);
  const { data: planned } = useQuery({
    queryKey: ['my-planned-events', attendingIds],
    queryFn: () => listEventsByIds(attendingIds),
    enabled: attendingIds.length > 0,
  });
  const nextEvent = useMemo(() => {
    const now = Date.now();
    return (
      (planned ?? [])
        .filter((e) => new Date(e.startAt).getTime() >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
    );
  }, [planned]);

  const onShare = () => {
    try {
      void Share.share({
        message: `Finde mich auf dots. — füg mich hinzu: @${username}`,
      }).catch(() => undefined);
    } catch {
      /* Share auf manchen Plattformen nicht verfügbar — bewusst ignorieren. */
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Subtiler Marken-Gradient hinter dem Kopf (lässt das Glas „lesen"). */}
      <LinearGradient
        pointerEvents="none"
        colors={[`${t.accent}1F`, `${t.accentBlue}0A`, 'transparent']}
        style={[styles.bgGradient, { height: insets.top + 260 }]}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}>
        {/* Kopfzeile */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>
              Profil<Text style={{ color: t.accent }}>.</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Einstellungen"
            style={({ pressed }) => [
              styles.gear,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}>
            <Ionicons name="settings-outline" size={20} color={t.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Profil-Card */}
        <ProfileHeaderCard
          name={name}
          username={username}
          email={email}
          bio={bio}
          seed={seed}
          imageUri={avatar}
          onAvatarPress={() => void pickAvatar()}
          onShare={onShare}
          stats={[
            { label: 'Favoriten', value: favorites.size, icon: 'heart', onPress: () => router.navigate('/favorites') },
            { label: 'Zusagen', value: attending.size, icon: 'checkmark-circle', onPress: () => router.navigate('/plans') },
            { label: 'Freunde', value: friendsCount, icon: 'people', onPress: () => router.navigate('/friends') },
          ]}
        />

        {/* Dein Plan */}
        <View style={styles.section}>
          <NextPlanCard
            event={nextEvent}
            onOpen={() => router.navigate('/plans')}
            onDiscover={() => router.navigate('/plans')}
          />
        </View>

        {/* Favoriten — eigener Einstieg (nicht mehr in der Tab-Leiste) */}
        <View style={styles.section}>
          <Pressable
            onPress={() => router.navigate('/favorites')}
            accessibilityLabel="Favoriten öffnen"
            style={({ pressed }) => [
              styles.linkCard,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
            ]}>
            <View style={[styles.linkIcon, { backgroundColor: `${t.accent}1F` }]}>
              <Ionicons name="heart" size={20} color={t.accent} />
            </View>
            <View style={styles.linkBody}>
              <Text style={[styles.linkTitle, { color: t.colors.textPrimary }]}>Favoriten</Text>
              <Text style={[styles.linkSub, { color: t.colors.textSecondary }]}>
                {favorites.size === 0
                  ? 'Deine gespeicherten Events'
                  : `${favorites.size} gespeicherte${favorites.size === 1 ? 's' : ''} Event${favorites.size === 1 ? '' : 's'}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 24 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  linkIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  linkBody: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  linkSub: { fontSize: 13 },
});
