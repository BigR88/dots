import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Category } from '@dots/shared';
import { useTheme } from '@/theme/theme';

/** Kategorie als stilles Icon+Text-Label (keine Pill-Fläche mehr). */
export function CategoryBadge({ category }: { category: Category | null }) {
  const t = useTheme();
  if (!category) return null;
  const color = category.color ?? t.accent;
  return (
    <View style={styles.badge}>
      <Ionicons name={(category.icon ?? 'ellipse') as never} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{category.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontSize: 12.5, fontWeight: '700' },
});
