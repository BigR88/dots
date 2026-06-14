import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from '@/components/AuthScreen';
import { DeviceFrame } from '@/components/DeviceFrame';
import { queryClient } from '@/data/query-client';
import { useAttendanceSync } from '@/hooks/use-attendance';
import { AuthProvider, isSupabaseConfigured, useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/theme/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
            <DeviceFrame>
              <AuthGate />
            </DeviceFrame>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Entscheidet, ob Anmelde-Screen oder App gezeigt wird. */
function AuthGate() {
  const t = useTheme();
  const { session, loading } = useAuth();
  useAttendanceSync(); // hält „Bin dabei" mit der Session synchron

  // Ohne Backend (Demo) kein Gate — App direkt zeigen.
  if (isSupabaseConfigured) {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background }}>
          <ActivityIndicator color={t.accent} />
        </View>
      );
    }
    if (!session) return <AuthScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="add-friends" />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
