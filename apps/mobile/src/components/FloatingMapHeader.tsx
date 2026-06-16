import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  /** Such-/Filter-Button: offen = „×", sonst Lupe. */
  searchOpen: boolean;
  hasActiveFilters: boolean;
  onSearch: () => void;
}

/**
 * Schwebender Karten-Header: „karte."-Wortmarke oben links in einer weißen,
 * abgerundeten Box (gleicher Look wie die Datums-Box & der Such-Button), runder
 * Such-/Filter-Button rechts.
 */
export function FloatingMapHeader({ searchOpen, hasActiveFilters, onSearch }: Props) {
  const t = useTheme();
  return (
    <View style={styles.row} pointerEvents="box-none">
      <View
        style={[styles.brandBox, floatShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <Text style={[styles.brand, { color: t.colors.textPrimary }]}>
          karte<Text style={{ color: t.accent }}>.</Text>
        </Text>
      </View>

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

const floatShadow = Platform.select({
  web: { boxShadow: '0 6px 18px rgba(17,17,20,0.12)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandBox: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  brand: { fontSize: 21, fontWeight: '900', letterSpacing: -0.8 },
  dot: { position: 'absolute', top: -1, right: -1, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
});
