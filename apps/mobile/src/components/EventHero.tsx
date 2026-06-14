import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { hexA } from '@/lib/color';
import { useTheme } from '@/theme/theme';
import { FavoriteButton } from './FavoriteButton';
import { GlassButton } from './GlassButton';

interface Props {
  color: string;
  icon: string;
  coverImageUrl?: string | null;
  eventId: string;
  topInset: number;
  onClose: () => void;
}

/**
 * Weicher Gradient-Hero der Detailseite: durchscheinender Kategorie-Verlauf
 * (oder Cover-Bild) mit großem Icon, runden Glas-Buttons für Herz & Schließen.
 */
export function EventHero({ color, icon, coverImageUrl, eventId, topInset, onClose }: Props) {
  const t = useTheme();

  return (
    <View style={[styles.hero, { backgroundColor: t.colors.background }]}>
      {coverImageUrl ? (
        <>
          <Image source={coverImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['transparent', hexA('#0B0B0F', 0.35)]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <>
          <LinearGradient
            colors={[hexA(color, 0.55), hexA(color, 0.16), 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.iconHalo, { backgroundColor: hexA(color, 0.18) }]}>
            <Ionicons name={icon as never} size={60} color={color} />
          </View>
        </>
      )}

      <View style={[styles.topRow, { top: topInset + 6 }]} pointerEvents="box-none">
        <GlassButton accessibilityLabel="Favorit">
          <FavoriteButton eventId={eventId} variant="plain" size={22} />
        </GlassButton>
        <GlassButton icon="close" onPress={onClose} accessibilityLabel="Schließen" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  iconHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
