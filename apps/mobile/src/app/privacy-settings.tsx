import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacySettingRow } from '@/components/profile/PrivacySettingRow';
import { setPrivacyPref, usePrivacyPrefs } from '@/hooks/use-privacy-prefs';
import { useLocationSharing } from '@/hooks/use-location-sharing';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/theme';

/**
 * Privatsphäre — eigener Unter-Screen der Einstellungen. Bündelt Sichtbarkeit,
 * Auffindbarkeit und „Standort für Freunde". Voll übersetzt (DE/EN). Mit „bald"
 * markierte Optionen merken sich die Auswahl bereits lokal ([[use-privacy-prefs]]).
 */
export default function PrivacySettingsScreen() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [shareLocation, setShareLocation] = useLocationSharing();
  const prefs = usePrivacyPrefs();
  const soon = tr('tag.soon');

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          hitSlop={8}
          accessibilityLabel={tr('settings.back')}>
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.colors.textPrimary }]}>{tr('section.privacy')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <PrivacySettingRow
            icon="navigate"
            label={tr('priv.locationFriends')}
            sub={tr('priv.locationFriends.sub')}
            value={shareLocation}
            onValueChange={setShareLocation}
          />
          <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
          <PrivacySettingRow
            icon="at"
            label={tr('priv.discoverable')}
            sub={tr('priv.discoverable.sub')}
            value={prefs.discoverable}
            onValueChange={(v) => setPrivacyPref('discoverable', v)}
            upcoming
            tagLabel={soon}
          />
          <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
          <PrivacySettingRow
            icon="calendar"
            label={tr('priv.showAttendance')}
            sub={tr('priv.showAttendance.sub')}
            value={prefs.show_attendance}
            onValueChange={(v) => setPrivacyPref('show_attendance', v)}
            upcoming
            tagLabel={soon}
          />
          <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
          <PrivacySettingRow
            icon="lock-closed"
            label={tr('priv.profileVisible')}
            sub={tr('priv.profileVisible.sub')}
            value={prefs.profile_visible}
            onValueChange={(v) => setPrivacyPref('profile_visible', v)}
            upcoming
            tagLabel={soon}
          />
        </View>
        <Text style={[styles.note, { color: t.colors.textMuted }]}>{tr('privacy.note')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 10, marginHorizontal: 2 },
});
