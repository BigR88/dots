import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * Heller Premium-Hintergrund mit weichem „Aurora"-Schimmer: Basisfläche +
 * dezenter Verlauf oben + zwei sehr leise Farb-Blobs (Violett/Blau). Liegt
 * hinter dem Screen-Inhalt; sorgt für die luftige Liquid-Glass-Stimmung.
 */
export function ScreenBackground({ children }: PropsWithChildren) {
  const t = useTheme();
  const dark = t.scheme === 'dark';

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={
            dark
              ? ['rgba(108,92,255,0.10)', 'rgba(59,130,246,0.04)', 'transparent']
              : ['rgba(108,92,255,0.10)', 'rgba(59,130,246,0.05)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.blob, styles.blobViolet, { backgroundColor: t.accent, opacity: dark ? 0.18 : 0.12 }]} />
        <View style={[styles.blob, styles.blobBlue, { backgroundColor: t.accentBlue, opacity: dark ? 0.16 : 0.10 }]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute', width: 340, height: 340, borderRadius: 170 },
  blobViolet: { top: -120, right: -90 },
  blobBlue: { top: 180, left: -130 },
});
