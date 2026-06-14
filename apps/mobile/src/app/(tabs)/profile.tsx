import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXTURE_FRIENDS } from '@dots/shared';
import { AccountActionCard } from '@/components/profile/AccountActionCard';
import { NextPlanCard } from '@/components/profile/NextPlanCard';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { SectionLabel } from '@/components/profile/SectionLabel';
import { VibeChips } from '@/components/profile/VibeChips';
import { listEventsByIds } from '@/data/events';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAttendingIds } from '@/hooks/use-attendance';
import { useAuth } from '@/hooks/use-auth';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useFriendOverview } from '@/hooks/use-friends';
import { useMyProfile } from '@/hooks/use-profile';
import { suggestUsername } from '@/lib/username';
import { useTheme } from '@/theme/theme';

export default function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { displayName, email, signOut } = useAuth();

  const profile = useMyProfile();
  const favorites = useFavoriteIds();
  const attending = useAttendingIds();
  const overview = useFriendOverview();

  const name = profile.data?.displayName ?? displayName ?? 'Gast';
  const username = profile.data?.username ?? suggestUsername(displayName, email);
  const bio = profile.data?.bio ?? null;
  const interests = profile.data?.interests ?? [];
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
            <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>Dein dots.-Konto</Text>
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
          onEdit={() => router.push('/edit-profile')}
          onShare={onShare}
          stats={[
            { label: 'Favoriten', value: favorites.size, icon: 'heart', onPress: () => router.navigate('/favorites') },
            { label: 'Zusagen', value: attending.size, icon: 'checkmark-circle' },
            { label: 'Freunde', value: friendsCount, icon: 'people', onPress: () => router.navigate('/friends') },
          ]}
        />

        {/* Dein Vibe */}
        <View style={styles.section}>
          <SectionLabel title="Dein Vibe" hint="Deine Lieblingskategorien." />
          {interests.length > 0 ? (
            <VibeChips selected={interests} />
          ) : (
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.vibePrompt,
                { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Ionicons name="sparkles-outline" size={18} color={t.accent} />
              <Text style={[styles.vibePromptText, { color: t.colors.textSecondary }]}>
                Wähle deine Lieblingskategorien
              </Text>
              <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Aktuelle Pläne */}
        <View style={styles.section}>
          <SectionLabel title="Aktuelle Pläne" hint="Dein nächstes Event." />
          <NextPlanCard
            event={nextEvent}
            onOpen={(id) => router.push(`/event/${id}`)}
            onDiscover={() => router.navigate('/')}
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <SectionLabel title="Account" />
          <AccountActionCard
            actions={[
              { icon: 'create-outline', label: 'Profil bearbeiten', onPress: () => router.push('/edit-profile') },
              { icon: 'log-out-outline', label: 'Abmelden', onPress: signOut, danger: true },
            ]}
          />
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
  subtitle: { fontSize: 13.5, marginTop: 1 },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 24 },
  vibePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  vibePromptText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
