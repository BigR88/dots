import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * Ruhiger, flacher Premium-Hintergrund: nur eine einzige, neutrale Grundfläche
 * (kein Verlauf, keine Farb-Blobs). Sorgt für viel Weißraum und einen cleanen,
 * minimalistischen Look. Liegt hinter dem Screen-Inhalt.
 */
export function ScreenBackground({ children }: PropsWithChildren) {
  const t = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
