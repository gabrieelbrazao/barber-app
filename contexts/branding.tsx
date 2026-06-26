import { createContext, useContext, useMemo } from 'react';

import { Colors } from '@/constants/theme';
import { mergeBranding, type Palette } from '@/lib/branding';
import { useShopBranding } from '@/lib/queries';

type BrandingValue = {
  /** True once the branding fetch has settled (success or error) — gates the splash. */
  ready: boolean;
  logoUrl: string | null;
  name: string | null;
  /** Default palette merged with the shop's saved overrides, per scheme. */
  palette: { light: Palette; dark: Palette };
};

// Fallback = the static Classic Barbershop palette, so anything rendered without a
// provider (or before the fetch resolves) still themes correctly.
const DEFAULT: BrandingValue = {
  ready: false,
  logoUrl: null,
  name: null,
  palette: { light: { ...Colors.light }, dark: { ...Colors.dark } },
};

const BrandingContext = createContext<BrandingValue>(DEFAULT);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useShopBranding();

  const value = useMemo<BrandingValue>(
    () => ({
      ready: !isLoading,
      logoUrl: data?.logo_url ?? null,
      name: data?.name ?? null,
      palette: {
        light: mergeBranding(data?.colors, 'light'),
        dark: mergeBranding(data?.colors, 'dark'),
      },
    }),
    [data, isLoading]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
