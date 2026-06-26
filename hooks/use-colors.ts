import { useBranding } from '@/contexts/branding';
import { useThemeMode } from '@/contexts/theme-mode';

/** Returns the full active color palette (shop branding + the user's theme choice). */
export function useColors() {
  const { scheme } = useThemeMode();
  return useBranding().palette[scheme];
}
