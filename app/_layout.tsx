import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, profile, loading } = useSession();

  // Hold the splash until auth + profile resolve, so guards settle before first paint.
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  const isCustomer = !!session && profile?.role === 'customer';
  const isBarber = !!session && profile?.role === 'barber';

  // Signed in but no usable profile/role (e.g. the profile row failed to load).
  // Session is only published after the profile resolves, so this is a real error
  // state, not a loading gap — show an escape hatch instead of an empty navigator.
  if (session && !isCustomer && !isBarber) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ProfileUnavailable />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isCustomer}>
          <Stack.Screen name="(customer)" />
        </Stack.Protected>
        <Stack.Protected guard={isBarber}>
          <Stack.Screen name="(barber)" />
        </Stack.Protected>
        {/* Dev-only component gallery — never ship it as a reachable production route. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="catalog" options={{ headerShown: true, title: 'Catalog' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function ProfileUnavailable() {
  const { signOut } = useSession();
  return (
    <Screen>
      <View style={styles.center}>
        <ThemedText type="title">Account unavailable</ThemedText>
        <ThemedText muted style={styles.centerText}>
          We couldn&apos;t load your profile. Check your connection and sign in again.
        </ThemedText>
        <Button title="Sign out" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  centerText: {
    textAlign: 'center',
  },
});
