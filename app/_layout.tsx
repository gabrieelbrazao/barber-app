import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button, Screen } from '@/components/ui';
import { StripeProvider } from '@/lib/stripe';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { BrandingProvider, useBranding } from '@/contexts/branding';
import { SessionProvider, useSession } from '@/contexts/session';
import { ThemeModeProvider, useThemeMode } from '@/contexts/theme-mode';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/config';
import { configureNotificationHandler } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();
// How reminders present while the app is foregrounded (banner + list, no sound).
configureNotificationHandler();

/**
 * Hard ceiling on the splash. Auth refresh and the branding fetch both hit the
 * network, and a hung request would otherwise leave the user staring at the
 * splash forever — after this we render with whatever resolved (default palette,
 * signed-out) and let the providers flip the UI when they catch up.
 */
const SPLASH_TIMEOUT_MS = 6000;

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
                <Payments>
                  <RootNavigator />
                </Payments>
              </SessionProvider>
            </BrandingProvider>
          </ThemeModeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Deposits are opt-in per build — skip Stripe entirely when no key is configured. */
function Payments({ children }: { children: React.ReactElement }) {
  if (!STRIPE_PUBLISHABLE_KEY) return children;
  return <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>{children}</StripeProvider>;
}

function RootNavigator() {
  const { session, profile, loading } = useSession();
  const branding = useBranding();
  const { scheme, ready: themeReady } = useThemeMode();

  // Hold the splash until auth + profile, branding, AND the saved theme choice
  // resolve, so guards settle and the themed palette is ready before first paint.
  const resolved = !loading && branding.ready && themeReady;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (resolved) return;
    const id = setTimeout(() => setTimedOut(true), SPLASH_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [resolved]);

  const ready = resolved || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  const palette = branding.palette[scheme];

  // Paint the window behind the navigator so scheme changes and the gap between
  // splash and first frame don't flash white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  if (!ready) {
    return null;
  }

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

/**
 * Last-resort boundary: a throw anywhere under the root layout replaces the
 * providers themselves, so this cannot use the branding/theme contexts or the
 * UI kit — it styles straight off the static tokens.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <Text style={[styles.fallbackTitle, { color: c.text }]}>Algo deu errado</Text>
      <Text style={[styles.centerText, { color: c.textMuted }]}>
        O app encontrou um erro inesperado. Tente novamente.
      </Text>
      {__DEV__ ? (
        <Text style={[styles.centerText, styles.fallbackDetail, { color: c.textMuted }]}>
          {error.message}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={[styles.fallbackButton, { backgroundColor: c.accent }]}>
        <Text style={[styles.fallbackButtonText, { color: c.onAccent }]}>Tentar novamente</Text>
      </Pressable>
    </View>
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
  // No custom family here: the boundary can fire before the fonts resolve.
  fallbackTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  fallbackDetail: {
    fontSize: 12,
  },
  fallbackButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  fallbackButtonText: {
    fontWeight: '600',
  },
});
