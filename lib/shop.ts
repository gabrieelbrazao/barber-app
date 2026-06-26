/** Pure shop helpers (unit-tested in __tests__/shop.test.ts). */

/** True when `profile` is the owner of `shop` — drives the owner-only admin tab. */
export function isOwner(
  profile: { id: string } | null | undefined,
  shop: { owner_id: string | null } | null | undefined
): boolean {
  return !!profile && !!shop?.owner_id && profile.id === shop.owner_id;
}

// Storage object keys — kept here (pure, no native imports) so they're unit-testable.
// Objects live under `<shopId>/...` so storage RLS can scope writes to the owning shop.

export function logoObjectPath(shopId: string): string {
  return `${shopId}/logo`;
}

export function bannerObjectPath(shopId: string, bannerId: string): string {
  return `${shopId}/banners/${bannerId}`;
}
