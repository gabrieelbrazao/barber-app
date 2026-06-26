/**
 * Resolve a single themed color, honoring per-call light/dark overrides, the
 * shop's runtime branding, and the user's theme-mode choice.
 */

import { useBranding } from '@/contexts/branding';
import { useThemeMode } from '@/contexts/theme-mode';
import type { ColorName } from '@/constants/theme';

export function useThemeColor(props: { light?: string; dark?: string }, colorName: ColorName) {
  const { scheme } = useThemeMode();
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return useBranding().palette[scheme][colorName];
}
