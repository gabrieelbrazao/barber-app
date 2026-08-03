import { discountedPrice, promoDiscountCents } from '@/lib/promo';

describe('promoDiscountCents', () => {
  it('computes a percentage discount', () => {
    expect(promoDiscountCents(5000, 'percent', 20)).toBe(1000);
    expect(discountedPrice(5000, 'percent', 20)).toBe(4000);
  });

  it('computes a fixed-amount discount (reais → cents)', () => {
    expect(promoDiscountCents(5000, 'amount', 15)).toBe(1500);
    expect(discountedPrice(5000, 'amount', 15)).toBe(3500);
  });

  it('never discounts below zero', () => {
    expect(promoDiscountCents(1000, 'amount', 50)).toBe(1000);
    expect(discountedPrice(1000, 'amount', 50)).toBe(0);
  });
});
