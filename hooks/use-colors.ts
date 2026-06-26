import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Returns the full active color palette for the current scheme. */
export function useColors() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
