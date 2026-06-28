import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  searchOpen: boolean;
  onSearch: () => void;
  onFilter: () => void;
  /** Anzahl aktiver Filter (Kategorie + Schnellfilter) → Badge am Filterbutton. */
  filterCount: number;
}

/**
 * Schwebender Karten-Header: „karte."-Wortmarke links; rechts zwei getrennte
 * Buttons — Suche (Lupe) und Filter (Regler) mit dezenter Count-Badge.
 */
export function FloatingMapHeader({ searchOpen, onSearch, onFilter, filterCount }: Props) {
  const t = useTheme();
  return (
    <View style={styles.row} pointerEvents="box-none">
      <View style={[styles.brandBox, floatShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <Text style={[styles.brand, { color: t.colors.textPrimary }]}>
          karte<Text style={{ color: t.accent }}>.</Text>
        </Text>
      </View>

      <View style={styles.actions}>
        <GlassButton
          solid
          icon={searchOpen ? 'close' : 'search'}
          onPress={onSearch}
          accessibilityLabel="Suchen"
        />
        <View>
          <GlassButton solid icon="options-outline" onPress={onFilter} accessibilityLabel="Filter" />
          {filterCount > 0 && (
            <View pointerEvents="none" style={[styles.badge, { backgroundColor: t.accent, borderColor: t.colors.surface }]}>
              <Text style={styles.badgeText}>{filterCount}</Text>
            </View>
          )}
        </View>
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
