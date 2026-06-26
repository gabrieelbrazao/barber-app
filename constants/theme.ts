/**
 * "Classic Barbershop" design tokens — the single source of truth for the app's look.
 * Premium / traditional: warm charcoal surfaces, gold accent, serif headings over a sans body.
 * Full light + dark palettes, driven by the device color scheme.
 *
 * `Colors.light` and `Colors.dark` MUST share the same keys — `useThemeColor` keys off their
 * intersection (see hooks/use-theme-color.ts).
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1A17',
    textMuted: '#6E665B',
    background: '#FAF7F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F1ECE3',
    border: '#E4DCCF',
    accent: '#B8860B',
    accentText: '#1C1A17',
    onAccent: '#FFFFFF',
    // status
    pending: '#C8862C',
    confirmed: '#3E7C5A',
    cancelled: '#B4453A',
    completed: '#6E7A86',
    // template-compat aliases (tab bar, themed primitives)
    tint: '#B8860B',
    icon: '#6E665B',
    tabIconDefault: '#6E665B',
    tabIconSelected: '#B8860B',
  },
  dark: {
    text: '#F3EEE4',
    textMuted: '#A39B8C',
    background: '#121113',
    surface: '#1C1B1E',
    surfaceAlt: '#26242A',
    border: '#33303A',
    accent: '#D4A24C',
    accentText: '#121113',
    onAccent: '#121113',
    // status (lifted for contrast on dark surfaces)
    pending: '#E0A24A',
    confirmed: '#5BA37C',
    cancelled: '#D46A5E',
    completed: '#8A97A3',
    // template-compat aliases
    tint: '#D4A24C',
    icon: '#A39B8C',
    tabIconDefault: '#A39B8C',
    tabIconSelected: '#D4A24C',
  },
} as const;

export type ColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Appointment status → color token name. */
export const StatusColorName = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  completed: 'completed',
} as const satisfies Record<string, ColorName>;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * Serif family for headings (loaded via @expo-google-fonts/playfair-display in the root layout).
 * The keys here are the names passed to `useFonts`.
 */
export const FontFamily = {
  serif: 'PlayfairDisplay_700Bold',
  serifSemiBold: 'PlayfairDisplay_600SemiBold',
  serifRegular: 'PlayfairDisplay_400Regular',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
