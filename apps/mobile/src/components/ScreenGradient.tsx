import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

/**
 * Subtiler Marken-Verlauf (Violett → Blau → transparent) hinter dem Kopfbereich,
 * wie auf dem Profil. Liegt absolut oben und reicht nicht in Taps hinein.
 */
export function ScreenGradient({ extra = 260, style }: { extra?: number; style?: ViewStyle }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`${t.accent}1F`, `${t.accentBlue}0A`, 'transparent']}
      style={[styles.gradient, { height: insets.top + extra }, style]}
    />
  );
}

const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
});
