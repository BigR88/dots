import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  /** Such-/Filter-Button: offen = „×", sonst Lupe. */
  searchOpen: boolean;
  hasActiveFilters: boolean;
  onSearch: () => void;
}

/**
 * Sehr kompakter, schwebender Karten-Header: nackter „Karte."-Titel links
 * (ohne Chip, direkt über der Karte), runder Such-Button rechts. Ein dezenter
 * Text-Halo hält den Titel über dem Satellitenbild lesbar.
 */
export function FloatingMapHeader({ searchOpen, hasActiveFilters, onSearch }: Props) {
  const t = useTheme();
  const halo = t.scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)';
  return (
    <View style={styles.row} pointerEvents="box-none">
      <Text
        style={[styles.title, { color: t.colors.textPrimary, textShadowColor: halo }]}
        pointerEvents="none">
        Karte<Text style={{ color: t.accent }}>.</Text>
      </Text>

      <View>
        <GlassButton
          solid
          icon={searchOpen ? 'close' : 'search'}
          onPress={onSearch}
          accessibilityLabel="Suchen & filtern"
        />
        {!searchOpen && hasActiveFilters && (
          <View
            pointerEvents="none"
            style={[styles.dot, { backgroundColor: t.accent, borderColor: t.colors.surface }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    paddingLeft: 4,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  dot: { position: 'absolute', top: -1, right: -1, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
});
