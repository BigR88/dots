import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/theme/theme';

interface Props {
  title: string;
  /** Was das Konto hier freischaltet (ein kurzer Satz). */
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Zeigt einen dezenten Link zu den Einstellungen (Sprache, Rechtliches).
   * Wichtig im Profil-Tab: Ohne ihn hätten Gäste keinerlei Zugang zu
   * Impressum & Datenschutzerklärung in der App.
   */
  showSettingsLink?: boolean;
}

/**
 * Hinweis für Gäste auf Social-Tabs: Events & Karte gehen ohne Konto,
 * Freunde/Chat/Profil brauchen eins. Der Button führt zurück zum Login-Gate
 * (Gast-Modus wird beendet, das Root-Layout zeigt den Auth-Screen).
 */
export function GuestPrompt({ title, message, icon = 'people-outline', showSettingsLink }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { exitGuestMode } = useAuth();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 90 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${t.accent}1A` }]}>
        <Ionicons name={icon} size={34} color={t.accent} />
      </View>
      <GradientText style={styles.title}>{title}</GradientText>
      <Text style={[styles.message, { color: t.colors.textSecondary }]}>{message}</Text>
      <PrimaryButton
        label="Anmelden oder registrieren"
        onPress={exitGuestMode}
        style={styles.cta}
      />
      {showSettingsLink && (
        <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={styles.settingsLink}>
          <Ionicons name="settings-outline" size={15} color={t.colors.textSecondary} />
          <Text style={[styles.settingsText, { color: t.colors.textSecondary }]}>
            Einstellungen & Rechtliches
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  message: { fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: 14 },
  settingsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 4 },
  settingsText: { fontSize: 13.5, fontWeight: '600' },
});
