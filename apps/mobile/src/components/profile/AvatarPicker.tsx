import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GradientAvatar } from './GradientAvatar';

interface Props {
  name: string;
  seed: string;
  onPress?: () => void;
}

/**
 * Avatar-Auswahl im Edit-Screen. Aktuell Gradient-Initialen (kein Foto-Upload):
 * Es gibt noch keinen Supabase-Storage-Bucket. Sobald einer existiert, kann
 * `onPress` einen Image-Picker öffnen und das Foto hochladen — die UI ist hier
 * bereits vorbereitet (Kamera-Badge + Hinweis).
 */
export function AvatarPicker({ name, seed, onPress }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [{ transform: [{ scale: pressed && onPress ? 0.95 : 1 }] }]}>
        <GradientAvatar name={name} seed={seed} size={92} />
        <View style={[styles.badge, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="camera" size={16} color={t.accent} />
        </View>
      </Pressable>
      <Text style={[styles.hint, { color: t.colors.textMuted }]}>Foto-Upload kommt bald</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 12 },
});
