import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

// route.name → expo-router Href (Gruppe „(tabs)" taucht im Pfad nicht auf).
// index = Karte (Startbildschirm), discover = Entdecken-Liste.
const HREF: Record<string, string> = {
  index: '/',
  discover: '/discover',
  friends: '/friends',
  favorites: '/favorites',
  profile: '/profile',
};

// Strukturelle Typen für die react-navigation Tab-Bar-Props (vermeidet eine
// direkte Abhängigkeit von @react-navigation/bottom-tabs).
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

// In der Leiste ausgeblendete Routen (bleiben per Direktnavigation erreichbar,
// z. B. „Favoriten" übers Profil).
const HIDDEN = new Set(['favorites']);

// route.name → [aktiv, inaktiv] Ionicons
const ICONS: Record<string, [string, string]> = {
  index: ['map', 'map-outline'],
  discover: ['compass', 'compass-outline'],
  friends: ['people', 'people-outline'],
  favorites: ['heart', 'heart-outline'],
  profile: ['person', 'person-outline'],
};

/**
 * Schwebende Tab-Bar: abgesetzt vom Rand, weiße Fläche + feine Kante + dezenter
 * Schatten. Aktiver Tab = solides Lila-Icon, inaktive ruhig und grau. Reine
 * Darstellung — Navigation kommt unverändert aus react-navigation.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dark = t.scheme === 'dark';

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom - 8, 6) }]} pointerEvents="box-none">
      <View style={[dark ? styles.shadowDark : styles.shadow, { borderRadius: 30 }]}>
        <View
          style={[
            styles.bar,
            {
              // Voll deckend + sichtbare Kante: über der Satellitenkarte muss die Leiste klar lesbar sein.
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border,
            },
          ]}>
          {state.routes.filter((route) => !HIDDEN.has(route.name)).map((route) => {
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
                {focused ? (
                  <View style={[styles.activeIcon, { backgroundColor: t.accent }]}>
                    <Ionicons name={activeIcon as never} size={22} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.inactiveIcon}>
                    <Ionicons name={inactiveIcon as never} size={23} color={t.colors.textSecondary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'stretch' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { width: 46, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inactiveIcon: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
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
