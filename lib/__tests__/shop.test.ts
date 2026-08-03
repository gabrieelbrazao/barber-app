import { isOwner, logoObjectPath, bannerObjectPath, portfolioObjectPath } from '@/lib/shop';

describe('isOwner', () => {
  const shop = { owner_id: 'u1' };
  it('is true when the profile owns the shop', () => {
    expect(isOwner({ id: 'u1' }, shop)).toBe(true);
  });
  it('is false for a non-owner', () => {
    expect(isOwner({ id: 'u2' }, shop)).toBe(false);
  });
  it('is false when ownership data is missing', () => {
    expect(isOwner({ id: 'u1' }, { owner_id: null })).toBe(false);
    expect(isOwner(null, shop)).toBe(false);
    expect(isOwner({ id: 'u1' }, null)).toBe(false);
  });
});

describe('storage object paths', () => {
  it('keys the logo under the shop folder', () => {
    expect(logoObjectPath('shop1')).toBe('shop1/logo');
  });
  it('keys a banner under the shop folder', () => {
    expect(bannerObjectPath('shop1', 'b2')).toBe('shop1/banners/b2');
  });
  it('keys a portfolio image under the shop/barber folder', () => {
    expect(portfolioObjectPath('shop1', 'barber9', 'k3')).toBe('shop1/barber9/k3');
  });
});
