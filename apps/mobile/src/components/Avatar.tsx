import { StyleSheet, Text, View } from 'react-native';

interface Props {
  name: string;
  color: string;
  size?: number;
}

/** Initialen-Kreis als Avatar (Demo-Profile haben keine Fotos). */
export function Avatar({ name, color, size = 32 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '800' },
});
