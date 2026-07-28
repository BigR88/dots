import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTheme } from '@/theme/theme';

/**
 * Fallback für nicht auflösbare Pfade (Deep Links, vertippte Web-URLs) —
 * ersetzt Expo Routers englischen Default-„Unmatched Route"-Screen.
 */
export default function NotFoundScreen() {
  const t = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <EmptyState
        icon="compass-outline"
        title="Seite nicht gefunden"
        subtitle="Den Link gibt es nicht (mehr). Zurück zur Karte — da geht was."
      />
      <PrimaryButton label="Zur Karte" onPress={() => router.replace('/')} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  cta: { alignSelf: 'stretch', marginTop: 10 },
});
