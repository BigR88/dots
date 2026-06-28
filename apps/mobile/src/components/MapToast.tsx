import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Dezenter, selbst-ausblendender Hinweis (z. B. „Standort nicht verfügbar").
 * Schwebt unter der Top-Steuerung; pointerEvents none, blockiert die Karte nicht.
 */
export function MapToast({ message, top }: { message: string | null; top: number }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [message, fade]);

  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top, opacity: fade }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    backgroundColor: 'rgba(13,12,22,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    zIndex: 60,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  text: { fontSize: 13, fontWeight: '600', textAlign: 'center', color: '#fff' },
});
