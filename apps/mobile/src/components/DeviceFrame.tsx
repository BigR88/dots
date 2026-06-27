import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

/**
 * DeviceFrame — zeigt die App in der Web-Vorschau in einem iPhone-Gehäuse
 * (Dynamic Island, Statusleiste, Home-Indikator, simulierte Safe-Area-Insets),
 * damit das Layout dem echten Gerät entspricht. Auf nativen Plattformen
 * (Expo Go / Build) wird der Inhalt unverändert durchgereicht.
 */

// iPhone 15 Punktraster + Safe-Area-Insets (Dynamic-Island-Geräte).
const SCREEN_W = 393;
const SCREEN_H = 852;
const BEZEL = 14;
const FRAME_INSETS = { top: 59, bottom: 34, left: 0, right: 0 };

export function DeviceFrame({ children }: PropsWithChildren) {
  const t = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Echte Touch-Geräte (Handy/Tablet) oder installierte PWA: KEIN Mockup-Rahmen
  // — die App läuft im Vollbild mit echten Safe-Area-Insets. Der iPhone-Rahmen
  // erscheint nur in der Desktop-/Editor-Vorschau (Maus = „fine pointer") und
  // skaliert dort auf jede Panel-Breite herunter. Wichtig: NICHT über die
  // Fensterbreite erkennen — eine schmale Vorschau-Spalte ist kein Telefon.
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);
  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches === true;
  if (standalone || isTouchDevice) {
    return <>{children}</>;
  }

  const totalW = SCREEN_W + BEZEL * 2;
  const totalH = SCREEN_H + BEZEL * 2;
  const scale = Math.min(1, (winH - 32) / totalH, (winW - 32) / totalW);
  const dark = t.scheme === 'dark';

  return (
    <View style={[styles.backdrop, { backgroundColor: dark ? '#0A0C10' : '#E8EBF1' }]}>
      <View style={[styles.phone, { width: totalW, height: totalH, transform: [{ scale }] }]}>
        {/* Seitentasten (Deko) */}
        <View style={[styles.sideBtn, { left: -2.5, top: 150, height: 28 }]} />
        <View style={[styles.sideBtn, { left: -2.5, top: 205, height: 56 }]} />
        <View style={[styles.sideBtn, { left: -2.5, top: 272, height: 56 }]} />
        <View style={[styles.sideBtn, { right: -2.5, top: 230, height: 88 }]} />

        {/* Display */}
        <View style={[styles.screen, { backgroundColor: t.colors.background }]}>
          <SafeAreaInsetsContext.Provider value={FRAME_INSETS}>
            {children}
          </SafeAreaInsetsContext.Provider>

          {/* Statusleiste (Mock) */}
          <View pointerEvents="none" style={styles.statusBar}>
            <Text style={[styles.statusTime, { color: t.colors.textPrimary }]}>9:41</Text>
            <View style={styles.statusIcons}>
              <Ionicons name="cellular" size={15} color={t.colors.textPrimary} />
              <Ionicons name="wifi" size={15} color={t.colors.textPrimary} />
              <Ionicons name="battery-full" size={19} color={t.colors.textPrimary} />
            </View>
          </View>

          {/* Dynamic Island */}
          <View pointerEvents="none" style={styles.island} />

          {/* Home-Indikator */}
          <View
            pointerEvents="none"
            style={[styles.homeIndicator, { backgroundColor: t.colors.textPrimary }]}
          />
        </View>
      </View>

      <Text style={[styles.caption, { color: dark ? '#5A6170' : '#9AA3B2' }]}>
        iPhone-Vorschau · auf dem Handy via Expo Go
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phone: {
    padding: BEZEL,
    borderRadius: 56,
    backgroundColor: '#0B0B0D',
    borderWidth: 1.5,
    borderColor: '#3A3D45',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
  },
  sideBtn: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
    backgroundColor: '#26282E',
  },
  screen: {
    width: SCREEN_W,
    height: SCREEN_H,
    borderRadius: 44,
    overflow: 'hidden',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FRAME_INSETS.top,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 18,
    paddingHorizontal: 30,
  },
  statusTime: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  island: {
    position: 'absolute',
    top: 11,
    alignSelf: 'center',
    width: 122,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 140,
    height: 5,
    borderRadius: 3,
    opacity: 0.35,
  },
  caption: { position: 'absolute', bottom: 12, fontSize: 12, fontWeight: '500' },
});
