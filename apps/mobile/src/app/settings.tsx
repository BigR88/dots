import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacySettingRow } from '@/components/profile/PrivacySettingRow';
import { SectionLabel } from '@/components/profile/SectionLabel';
import { useLanguage, type Language } from '@/hooks/use-language';
import { useLocation } from '@/hooks/use-location';
import { useLocationEnabled } from '@/hooks/use-location-enabled';
import { useLocationSharing } from '@/hooks/use-location-sharing';
import { setPrivacyPref, usePrivacyPrefs } from '@/hooks/use-privacy-prefs';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/theme';

/**
 * Einstellungen — zentrale Stelle für Privatsphäre, Karten-Standort und Sprache.
 * Erreichbar über das Zahnrad im Profil (und auf der Karte). Voll übersetzt
 * (DE/EN über die i18n-Schicht), Sprachwahl wirkt sofort auf diesen Screen.
 */
export default function SettingsScreen() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [locationEnabled, setLocationEnabled] = useLocationEnabled();
  const [shareLocation, setShareLocation] = useLocationSharing();
  const prefs = usePrivacyPrefs();
  const [lang, setLang] = useLanguage();
  const { request, status } = useLocation();

  const toggleLocation = (next: boolean) => {
    // Funktion sofort umschalten (nicht vom Geolocation-Ergebnis abhängig machen);
    // beim Einschalten den Standort anfragen — der Punkt erscheint, sobald er da ist.
    setLocationEnabled(next);
    if (next) void request();
  };
  const denied = status === 'denied';
  const soon = tr('tag.soon');

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header mit Zurück-Button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          hitSlop={8}
          accessibilityLabel={tr('settings.back')}>
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.colors.textPrimary }]}>{tr('settings.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        {/* Privatsphäre */}
        <SectionLabel title={tr('section.privacy')} />
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

        {/* Karte */}
        <View style={styles.gap} />
        <SectionLabel title={tr('section.map')} />
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <PrivacySettingRow
            icon="location"
            label={tr('map.location')}
            sub={tr('map.location.sub')}
            value={locationEnabled}
            onValueChange={toggleLocation}
          />
        </View>
        {locationEnabled && denied && (
          <Text style={[styles.note, { color: t.colors.textMuted }]}>
            {lang === 'de'
              ? 'Der Standortzugriff ist im Gerät blockiert. Erlaube ihn in den System-Einstellungen.'
              : 'Location access is blocked on your device. Allow it in your system settings.'}
          </Text>
        )}

        {/* Sprache */}
        <View style={styles.gap} />
        <SectionLabel title={tr('section.language')} />
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={[styles.segment, { backgroundColor: t.colors.surfaceElevated }]}>
            {(['de', 'en'] as Language[]).map((l) => {
              const active = lang === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => setLang(l)}
                  style={({ pressed }) => [
                    styles.segBtn,
                    active && { backgroundColor: t.accent },
                    { opacity: pressed && !active ? 0.6 : 1 },
                  ]}>
                  <Text style={[styles.segText, { color: active ? '#fff' : t.colors.textPrimary }]}>
                    {tr(l === 'de' ? 'lang.de' : 'lang.en')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={[styles.note, { color: t.colors.textMuted }]}>{tr('lang.note')}</Text>
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
  gap: { height: 20 },
  segment: { flexDirection: 'row', gap: 4, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 9 },
  segText: { fontSize: 14.5, fontWeight: '800' },
});
