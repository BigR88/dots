import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

// Pro Nutzer:in ein stabiles, schönes 2-Farb-Verlaufspaar (Marken-nah, aber
// persönlich). Auswahl deterministisch aus einem Seed (User-ID/Name).
const PAIRS: [string, string][] = [
  ['#7B61FF', '#3B82F6'],
  ['#FF2E93', '#FF6A3D'],
  ['#00D6A0', '#2E8BFF'],
  ['#B06CFF', '#FF2D55'],
  ['#FF9F0A', '#FF2E93'],
  ['#2E8BFF', '#6C5CFF'],
];

function pairFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PAIRS[h % PAIRS.length];
}

interface Props {
  name: string;
  seed?: string;
  size?: number;
  onPress?: () => void;
  /** Wenn gesetzt → Foto statt Initiale (über den Marken-Verlauf gelegt). */
  imageUri?: string | null;
}

/**
 * Prominenter Profil-Avatar: Initiale auf weichem Marken-Verlauf (kein Foto nötig).
 * Tippen gibt leichtes Scale-Feedback (Microinteraction).
 *
 * Foto-Upload (Supabase Storage) ist bewusst noch nicht integriert — sobald ein
 * Bucket existiert, kann hier ein <Image> über den Verlauf gelegt werden.
 */
export function GradientAvatar({ name, seed, size = 84, onPress, imageUri }: Props) {
  const [c1, c2] = pairFor(seed ?? name);
  const initial = name.trim().slice(0, 1).toUpperCase() || '·';

  const body = (
    <LinearGradient
      colors={[c1, c2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.circle, glow(c1), { width: size, height: size, borderRadius: size / 2 }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      )}
    </LinearGradient>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      {body}
    </Pressable>
  );
}

const glow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 10px 24px ${color}55` } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '800', letterSpacing: -0.5 },
});
