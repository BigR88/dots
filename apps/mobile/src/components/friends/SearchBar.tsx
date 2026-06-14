import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

/**
 * Modernes, abgerundetes Premium-Suchfeld: Lupe links, Clear-Button rechts,
 * weiche Fläche mit feiner Kante + dezentem Schatten. `ref` erlaubt Fokus von
 * außen (Header-Action).
 */
export const SearchBar = forwardRef<TextInput, Props>(function SearchBar(
  { value, onChangeText, onClear, placeholder = 'Freund:innen suchen' },
  ref,
) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, softShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <Ionicons name="search" size={18} color={t.colors.textMuted} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: t.colors.textPrimary }]}
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Suche leeren">
          <Ionicons name="close-circle" size={18} color={t.colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
});

const softShadow = Platform.select({
  web: { boxShadow: '0 4px 16px rgba(17,24,39,0.05)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15.5, padding: 0, outlineWidth: 0 },
});
