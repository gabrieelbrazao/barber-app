import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Per-client (white-label) build config. The static defaults live in app.json;
 * this overrides the client-specific identity from environment variables set per
 * EAS build profile, so one codebase ships as many separately-branded apps.
 *
 * Per-client env (set in the build profile / .env):
 *   CLIENT_NAME      - display name (home screen + stores)
 *   CLIENT_SLUG      - Expo slug (unique per client)
 *   CLIENT_SCHEME    - deep-link scheme (unique per client)
 *   CLIENT_ICON      - path to the client's app icon
 *   CLIENT_SPLASH    - path to the client's splash image
 *   CLIENT_ANDROID_PACKAGE / CLIENT_IOS_BUNDLE - native ids (unique per client)
 *   EXPO_PUBLIC_SHOP_ID - the shops.id this build serves (read at runtime in lib/config.ts)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const name = process.env.CLIENT_NAME ?? config.name ?? 'Barbearia';
  const slug = process.env.CLIENT_SLUG ?? config.slug ?? 'barber-app';
  const scheme = process.env.CLIENT_SCHEME ?? (config.scheme as string) ?? 'barberapp';
  const icon = process.env.CLIENT_ICON ?? config.icon;
  const splashImage = process.env.CLIENT_SPLASH;

  return {
    ...config,
    name,
    slug,
    scheme,
    icon,
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.CLIENT_IOS_BUNDLE ?? config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: process.env.CLIENT_ANDROID_PACKAGE ?? config.android?.package,
    },
    // Override the splash image per client when provided, keeping the other
    // splash settings (resize mode, background) from app.json.
    plugins: splashImage
      ? config.plugins?.map((p) =>
          Array.isArray(p) && p[0] === 'expo-splash-screen'
            ? ['expo-splash-screen', { ...(p[1] as object), image: splashImage }]
            : p
        )
      : config.plugins,
  } as ExpoConfig;
};
