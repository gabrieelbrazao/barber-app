/** Pure promo-discount math (unit-tested). */

export type PromoKind = 'percent' | 'amount';

/**
 * The discount (in cents) a promo applies to `priceCents`.
 * - `percent`: `value` is 0–100.
 * - `amount`: `value` is whole currency units (reais), converted to cents.
 * Never exceeds the price (no negative totals).
 */
export function promoDiscountCents(priceCents: number, kind: PromoKind, value: number): number {
  const raw = kind === 'percent' ? Math.round((priceCents * value) / 100) : value * 100;
  return Math.max(0, Math.min(priceCents, raw));
}

/** Price after applying the promo. */
export function discountedPrice(priceCents: number, kind: PromoKind, value: number): number {
  return priceCents - promoDiscountCents(priceCents, kind, value);
}
