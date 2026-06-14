import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/theme/theme';

type Ring = 'gradient' | 'soft' | 'plain';

/**
 * Avatar mit dezentem „Story"-Ring (Social-/Instagram-Vibe, aber zurückhaltend).
 * `gradient` = Marken-Verlauf (für neue Anfragen hervorheben), `soft` = feiner
 * Ring in der Personenfarbe (Freundesliste), `plain` = ohne Ring.
 */
export function AvatarRing({
  name,
  color,
  size = 46,
  variant = 'soft',
}: {
  name: string;
  color: string;
  size?: number;
  variant?: Ring;
}) {
  const t = useTheme();
  if (variant === 'plain') return <Avatar name={name} color={color} size={size} />;

  const inner = size - 9; // Ring (2.5) + weißer Spalt (2) auf jeder Seite
  const content = (
    <View
      style={[
        styles.gap,
        { borderRadius: size / 2, backgroundColor: t.colors.surface },
      ]}>
      <Avatar name={name} color={color} size={inner} />
    </View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={t.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
        {content}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  gap: { padding: 2, alignItems: 'center', justifyContent: 'center' },
});
