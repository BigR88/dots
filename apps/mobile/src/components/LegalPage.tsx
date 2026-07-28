import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import type { LegalDoc } from '@/lib/legal';
import { useTheme } from '@/theme/theme';

interface Props {
  doc: LegalDoc;
  /** Zurück-Aktion — Routen geben router.back, das Auth-Overlay ein close. */
  onBack: () => void;
}

/**
 * Rechtstext-Seite (Datenschutz / Nutzungsregeln / Impressum) im Stil der
 * Einstellungen. Wird von den /legal-Routen genutzt und als Overlay im
 * Auth-Screen (der außerhalb des Routers lebt).
 */
export function LegalPage({ doc, onBack }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <GradientText style={styles.headerTitle}>{`${doc.title}.`}</GradientText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: t.colors.textMuted }]}>Stand: {doc.updated}</Text>
        {doc.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            {s.title ? (
              <Text style={[styles.sectionTitle, { color: t.colors.textPrimary }]}>{s.title}</Text>
            ) : null}
            <Text style={[styles.body, { color: t.colors.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  updated: { fontSize: 12.5, marginBottom: 14 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', marginBottom: 5 },
  body: { fontSize: 14, lineHeight: 21 },
});
