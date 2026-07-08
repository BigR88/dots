import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import type { TimeValue } from '@dots/shared';
import { GradientText } from '@/components/GradientText';
import { useTheme } from '@/theme/theme';
import { DateBar } from './DateBar';

/**
 * Schwebende „Glass HUD"-Kapsel der Karte: ein schlankes Milchglas-Band statt
 * großer weißer Flächen. Links die „dots."-Wortmarke (klein geschrieben, wie
 * die Seiten-Headlines), rechts die kompakte Glas-Datumsleiste (Heute/Morgen +
 * Kalender). Lesbar über der Karte durch die nahezu deckende Deckschicht.
 */
export function MapHud({
  time,
  onChangeTime,
  onOpenCalendar,
}: {
  time: TimeValue;
  onChangeTime: (v: TimeValue) => void;
  onOpenCalendar: () => void;
}) {
  const t = useTheme();
  const dark = t.scheme === 'dark';

  return (
    <View style={[styles.outer, softShadow]}>
      <BlurView
        intensity={40}
        tint={dark ? 'dark' : 'light'}
        style={[styles.hud, { borderColor: t.colors.glassBorder }]}>
        {/* Deckschicht: expo-blur (Web) überschreibt backgroundColor mit einer
            eigenen, zu dünnen Tint-Fläche — so bleibt die Kapsel klar lesbar. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: dark ? 'rgba(23,24,28,0.78)' : 'rgba(255,255,255,0.8)' },
          ]}
        />
        <View pointerEvents="none" style={[styles.litEdge, { backgroundColor: t.colors.glassHighlight }]} />
        <GradientText style={styles.brandMark}>dots.</GradientText>
        <View style={styles.dateWrap}>
          <DateBar
            value={time}
            onChange={onChangeTime}
            onOpenCalendar={onOpenCalendar}
            horizontalPadding={0}
            variant="glass"
          />
        </View>
      </BlurView>
    </View>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 8px 22px rgba(17,24,39,0.14)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  outer: { flex: 1, borderRadius: 23 },
  hud: {
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 9,
    overflow: 'hidden',
  },
  litEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  brandMark: { fontSize: 16, fontWeight: '900', letterSpacing: -0.6 },
  dateWrap: { flex: 1 },
});
