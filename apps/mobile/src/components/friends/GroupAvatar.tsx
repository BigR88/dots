import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme/theme';

/**
 * Gruppen-Avatar: zeigt das Profilbild der Gruppe, sonst einen Lila-Kreis mit
 * Initiale (oder People-Icon). Wird in Liste, Chat-Kopf und Details genutzt.
 */
export function GroupAvatar({
  name,
  uri,
  size = 40,
}: {
  name?: string;
  uri?: string;
  size?: number;
}) {
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={uri}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
      />
    );
  }
  const initial = name?.trim()?.slice(0, 1).toUpperCase();
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      {initial ? (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      ) : (
        <Ionicons name="people" size={size * 0.5} color="#fff" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '800' },
});
