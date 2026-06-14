import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  icon: string;
  children: React.ReactNode;
  onPress?: () => void;
}

/**
 * Elegante Info-Zeile (Detailseite): Icon im weichen Kreis + Text. Optional
 * antippbar (z. B. Adresse → Karte).
 */
export function InfoRow({ icon, children, onPress }: Props) {
  const t = useTheme();
  const body = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${t.accent}14` }]}>
        <Ionicons name={icon as never} size={17} color={t.accent} />
      </View>
      <Text style={[styles.text, { color: t.colors.textPrimary }]}>{children}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, flexShrink: 1, lineHeight: 20, fontWeight: '500' },
});
