/**
 * Runtime theming: merge a shop's saved color overrides onto the default palette.
 * Pure + framework-free so it is unit-tested directly (see __tests__/branding.test.ts).
 */

import { Colors, type ColorName } from '@/constants/theme';
import type { BrandColors } from '@/lib/database.types';

/** A full, mutable color palette keyed by the theme tokens (widened from the literal defaults). */
export type Palette = Record<ColorName, string>;
export type Scheme = 'light' | 'dark';

/**
 * The subset of theme tokens a shop owner may override from the admin screen.
 * Keeping it curated means a bad/partial override can never break contrast-critical
 * tokens — anything not listed always falls back to the default palette.
 */
export const OVERRIDABLE_TOKENS = [
  'accent',
  'background',
  'surface',
  'text',
  'tint',
] as const satisfies readonly ColorName[];

/** A full 6-digit hex color, e.g. `#1C1A17`. Partial/invalid input falls back to the default. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Merge `overrides[scheme]` onto the default palette for `scheme`. */
export function mergeBranding(
  overrides: BrandColors | null | undefined,
  scheme: Scheme
): Palette {
  const base = Colors[scheme];
  const ov = overrides?.[scheme];
  if (!ov) return { ...base };

  const merged: Palette = { ...base };
  for (const token of OVERRIDABLE_TOKENS) {
    const value = ov[token];
    if (typeof value === 'string' && HEX_COLOR.test(value)) {
      merged[token] = value;
    }
  }
  return merged;
}
