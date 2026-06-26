/**
 * Per‑client build configuration.
 *
 * Each white‑label build is pinned to a single shop via `EXPO_PUBLIC_SHOP_ID`
 * (set per EAS build profile — see app.config.ts). Every customer‑facing query
 * scopes to this id, and it is sent as sign‑up metadata so new accounts join the
 * right shop. RLS is the real isolation boundary; this is the client‑side anchor.
 */

const shopId = process.env.EXPO_PUBLIC_SHOP_ID;

if (!shopId) {
  throw new Error(
    'Missing EXPO_PUBLIC_SHOP_ID. Set it in this build profile (.env / EAS) to the shops.id this app serves.'
  );
}

export const SHOP_ID: string = shopId;
