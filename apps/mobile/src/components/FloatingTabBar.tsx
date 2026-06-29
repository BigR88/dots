import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// route.name → expo-router Href (Gruppe „(tabs)" taucht im Pfad nicht auf).
const HREF: Record<string, string> = {
  index: '/',
  discover: '/discover',
  friends: '/friends',
  favorites: '/favorites',
  profile: '/profile',
};

// Strukturelle Typen für die react-navigation Tab-Bar-Props.
interface TabRoute {
  key: string;
  name: string;
}
interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

// In der Leiste ausgeblendete Routen (über andere Wege erreichbar).
const HIDDEN = new Set(['favorites']);

// route.name → [aktiv, inaktiv] Ionicons. Bewusst klar UNTERSCHEIDBAR:
// discover = „sparkles" (Entdecken), friends = „people" (Gruppe),
// profile = „person-circle" (einzelner Kopf in Scheibe = Avatar).
const ICONS: Record<string, [string, string]> = {
  index: ['map', 'map-outline'],
  discover: ['sparkles', 'sparkles-outline'],
  friends: ['people', 'people-outline'],
  favorites: ['heart', 'heart-outline'],
  profile: ['person-circle', 'person-circle-outline'],
};

const BAR_PAD = 8;
const INDICATOR_W = 52;

/**
 * Schwebende Tab-Bar: solide Fläche (über der Satellitenkarte gut lesbar) mit
 * EINEM gleitenden Marken-Indikator hinter den Icons, der per Spring zum
 * aktiven Tab fährt. Aktives Icon weiß auf dem Verlauf, inaktive ruhig grau.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dark = t.scheme === 'dark';

  const visible = state.routes.filter((r) => !HIDDEN.has(r.name));
  const activeIndex = visible.findIndex((r) => state.routes[state.index]?.key === r.key);
  const [barW, setBarW] = useState(0);
  const slotW = barW > 0 ? (barW - BAR_PAD * 2) / visible.length : 0;
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (slotW <= 0 || activeIndex < 0) return;
    Animated.spring(indicatorX, {
      toValue: activeIndex * slotW,
      useNativeDriver: USE_NATIVE_DRIVER,
      bounciness: 7,
      speed: 12,
    }).start();
  }, [activeIndex, slotW, indicatorX]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom - 8, 6) }]} pointerEvents="box-none">
      <View style={[dark ? styles.shadowDark : styles.shadow, { borderRadius: 30 }]}>
        <View
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          style={[styles.bar, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          {/* Gleitender Marken-Indikator hinter den Icons */}
          {slotW > 0 && activeIndex >= 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicatorSlot, { width: slotW, transform: [{ translateX: indicatorX }] }]}>
              <LinearGradient
                colors={t.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.indicator, glow(t.accent)]}
              />
            </Animated.View>
          )}

          {visible.map((route) => {
            const focused = state.routes[state.index]?.key === route.key;
            const { options } = descriptors[route.key];
            const label = (options.title ?? route.name) as string;
            const [activeIcon, inactiveIcon] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                router.navigate((HREF[route.name] ?? `/${route.name}`) as never);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={styles.item}>
                <Ionicons
                  name={(focused ? activeIcon : inactiveIcon) as never}
                  size={focused ? 23 : 24}
                  color={focused ? '#fff' : t.colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const glow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 6px 18px ${color}66` } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'stretch' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: BAR_PAD,
  },
  item: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  indicatorSlot: {
    position: 'absolute',
    left: BAR_PAD,
    top: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: { width: INDICATOR_W, height: 40, borderRadius: 14 },
  shadow: {
    ...Platform.select({
      web: { boxShadow: '0 16px 36px rgba(17,24,39,0.16)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#1F2A44',
        shadowOpacity: 0.18,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      },
    }),
  },
  shadowDark: {
    ...Platform.select({
      web: { boxShadow: '0 16px 36px rgba(0,0,0,0.5)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      },
    }),
  },
});
