/**
 * Resolve a single themed color, honoring per-call light/dark overrides, the
 * shop's runtime branding, and the user's theme-mode choice.
 */

import { useBranding } from '@/contexts/branding';
import { useThemeMode } from '@/contexts/theme-mode';
import type { ColorName } from '@/constants/theme';

export function useThemeColor(props: { light?: string; dark?: string }, colorName: ColorName) {
  const { scheme } = useThemeMode();
  const { palette } = useBranding();
  const colorFromProps = props[scheme];

  return colorFromProps ?? palette[scheme][colorName];
}
