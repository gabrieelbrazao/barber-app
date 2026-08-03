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
import { BrandingProvider, useBranding } from '@/contexts/branding';
import { SessionProvider, useSession } from '@/contexts/session';
import { ThemeModeProvider, useThemeMode } from '@/contexts/theme-mode';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { configureNotificationHandler } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();
// How reminders present while the app is foregrounded (banner + list, no sound).
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Theme mode (system/light/dark) + branding wrap the session so the theme
              and logo are resolved on the auth screen too. */}
          <ThemeModeProvider>
            <BrandingProvider>
              <SessionProvider>
                <RootNavigator />
              </SessionProvider>
            </BrandingProvider>
          </ThemeModeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, profile, loading } = useSession();
  const branding = useBranding();
  const { scheme, ready: themeReady } = useThemeMode();

  // Hold the splash until auth + profile, branding, AND the saved theme choice
  // resolve, so guards settle and the themed palette is ready before first paint.
  const ready = !loading && branding.ready && themeReady;
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const palette = branding.palette[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      primary: palette.accent,
      border: palette.border,
    },
  };

  const isCustomer = !!session && profile?.role === 'customer';
  const isBarber = !!session && profile?.role === 'barber';

  // Signed in but no usable profile/role (e.g. the profile row failed to load).
  // Session is only published after the profile resolves, so this is a real error
  // state, not a loading gap — show an escape hatch instead of an empty navigator.
  if (session && !isCustomer && !isBarber) {
    return (
      <ThemeProvider value={navTheme}>
        <ProfileUnavailable />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
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
          <Stack.Screen name="catalog" options={{ headerShown: true, title: 'Catálogo' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

function ProfileUnavailable() {
  const { signOut } = useSession();
  return (
    <Screen>
      <View style={styles.center}>
        <ThemedText type="title">Conta indisponível</ThemedText>
        <ThemedText muted style={styles.centerText}>
          Não foi possível carregar seu perfil. Verifique sua conexão e entre novamente.
        </ThemedText>
        <Button title="Sair" onPress={() => signOut()} />
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
