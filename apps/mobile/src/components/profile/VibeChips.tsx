import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '@dots/shared';
import { useTheme } from '@/theme/theme';

interface Props {
  /** Ausgewählte Kategorie-Slugs. */
  selected: string[];
  /** Wenn gesetzt → auswählbar (Edit-Modus); sonst reine Anzeige. */
  onToggle?: (slug: string) => void;
}

/**
 * „Dein Vibe": Interessen als Kategorie-Chips. Ohne `onToggle` reine Anzeige
 * (nur ausgewählte), mit `onToggle` auswählbar (alle, aktive hervorgehoben) mit
 * leichtem Scale-Feedback.
 */
export function VibeChips({ selected, onToggle }: Props) {
  const t = useTheme();
  const editable = Boolean(onToggle);
  const list = editable ? CATEGORIES : CATEGORIES.filter((c) => selected.includes(c.slug));

  return (
    <View style={styles.wrap}>
      {list.map((c) => {
        const active = selected.includes(c.slug);
        return (
          <Pressable
            key={c.slug}
            onPress={() => onToggle?.(c.slug)}
            disabled={!editable}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? `${c.color}1F` : t.colors.surface,
                borderColor: active ? c.color : t.colors.border,
                opacity: pressed && editable ? 0.75 : 1,
                transform: [{ scale: pressed && editable ? 0.94 : 1 }],
              },
            ]}>
            <Ionicons
              name={c.icon as never}
              size={14}
              color={active ? c.color : t.colors.textMuted}
            />
            <Text
              style={[
                styles.label,
                { color: active ? t.colors.textPrimary : t.colors.textSecondary },
              ]}>
              {c.name}
            </Text>
            {editable && active && <Ionicons name="checkmark-circle" size={14} color={c.color} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, fontWeight: '700' },
});
