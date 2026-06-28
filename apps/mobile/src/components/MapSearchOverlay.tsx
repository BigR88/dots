import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { SearchBar } from './SearchBar';

/**
 * Schlankes Such-Overlay (von Filtern getrennt): eine schwebende Such-Card unter
 * dem Header. Tap außerhalb schließt. Bewusst minimal — kein großes Panel.
 */
export function MapSearchOverlay({
  value,
  onChange,
  top,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  top: number;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Suche schließen" />
      <View style={[styles.wrap, floatShadow, { top, backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <SearchBar value={value} onChange={onChange} />
      </View>
    </View>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: '0 8px 22px rgba(17,17,20,0.16)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
  },
});
