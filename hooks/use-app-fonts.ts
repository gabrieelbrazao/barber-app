import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';

/**
 * Loads the serif heading family (Playfair Display). The keys match `FontFamily` in
 * constants/theme.ts. Returns [loaded, error] like `useFonts`.
 */
export function useAppFonts() {
  return useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
}
