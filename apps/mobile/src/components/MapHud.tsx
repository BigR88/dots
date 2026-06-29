import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import type { TimeValue } from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { DateBar } from './DateBar';

/**
 * Schwebende „Glass HUD"-Kapsel der Karte: ein schlankes Milchglas-Band statt
 * großer weißer Flächen. Links der Marken-Punkt, rechts die kompakte Glas-
 * Datumsleiste (Heute/Morgen + Kalender). Lesbar über dem Satellitenbild durch
 * die nahezu deckende `cardGlass`-Fläche; im Dark-Theme trägt der Blur.
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
        style={[styles.hud, { backgroundColor: t.colors.cardGlass, borderColor: t.colors.glassBorder }]}>
        <View pointerEvents="none" style={[styles.litEdge, { backgroundColor: t.colors.glassHighlight }]} />
        <LinearGradient
          colors={t.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandDot}
        />
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
  brandDot: { width: 11, height: 11, borderRadius: 6 },
  dateWrap: { flex: 1 },
});
