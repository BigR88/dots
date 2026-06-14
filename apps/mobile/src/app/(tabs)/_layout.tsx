import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/FloatingTabBar';

/**
 * Tab-Navigation mit schwebender „Liquid Glass"-Leiste (FloatingTabBar).
 * Die Bar ist absolut positioniert und schwebt über dem Inhalt; die Screens
 * sorgen selbst für genügend `paddingBottom`, damit nichts verdeckt wird.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Entdecken' }} />
      <Tabs.Screen name="map" options={{ title: 'Karte' }} />
      <Tabs.Screen name="friends" options={{ title: 'Freunde' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favoriten' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
