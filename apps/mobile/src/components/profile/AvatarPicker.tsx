import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pickAvatar, setAvatar, useAvatar } from '@/hooks/use-avatar';
import { useTheme } from '@/theme/theme';
import { GradientAvatar } from './GradientAvatar';

interface Props {
  name: string;
  seed: string;
}

/**
 * Avatar-Auswahl im Edit-Screen: tippen öffnet die Foto-Galerie (quadratischer
 * Zuschnitt). Das gewählte Bild wird lokal gespeichert ([[use-avatar]]) und
 * erscheint sofort im Profil-Kopf. Ohne Foto bleibt die Gradient-Initiale.
 */
export function AvatarPicker({ name, seed }: Props) {
  const t = useTheme();
  const avatar = useAvatar();

  const pick = () => void pickAvatar();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={pick}
        accessibilityLabel="Profilbild ändern"
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
        <GradientAvatar name={name} seed={seed} size={92} imageUri={avatar} />
        <View style={[styles.badge, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="camera" size={16} color={t.accent} />
        </View>
      </Pressable>
      {avatar ? (
        <Pressable onPress={() => setAvatar(null)} hitSlop={6} accessibilityLabel="Profilbild entfernen">
          <Text style={[styles.action, { color: t.colors.textMuted }]}>Foto entfernen</Text>
        </Pressable>
      ) : (
        <Pressable onPress={pick} hitSlop={6}>
          <Text style={[styles.action, { color: t.accent }]}>Foto auswählen</Text>
        </Pressable>
      )}
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
  action: { fontSize: 13, fontWeight: '700' },
});
