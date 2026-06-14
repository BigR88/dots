import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Rahmenlose Suche auf Surface-Fläche. */
export function SearchBar({ value, onChange, placeholder = 'Events, Orte, Vibes suchen …' }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: t.colors.surface, borderRadius: t.radius.md }]}>
      <Ionicons name="search" size={15} color={t.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        style={[styles.input, { color: t.colors.textPrimary }]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Eventsuche"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Suche löschen">
          <Ionicons name="close-circle" size={16} color={t.colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
  },
  // outlineWidth: 0 entfernt den Browser-Fokusring in der Web-Vorschau.
  input: { flex: 1, fontSize: 15, paddingVertical: 0, outlineWidth: 0 },
});
