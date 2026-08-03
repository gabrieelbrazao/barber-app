import { loyaltyProgress } from '@/lib/loyalty';

describe('loyaltyProgress', () => {
  it('tracks progress within a card', () => {
    const p = loyaltyProgress(3, 10);
    expect(p.inCard).toBe(3);
    expect(p.remaining).toBe(7);
    expect(p.rewardReady).toBe(false);
  });

  it('flags a reward when a full card completes', () => {
    const p = loyaltyProgress(10, 10);
    expect(p.inCard).toBe(10);
    expect(p.remaining).toBe(0);
    expect(p.rewardReady).toBe(true);
  });

  it('rolls into the next card', () => {
    const p = loyaltyProgress(11, 10);
    expect(p.inCard).toBe(1);
    expect(p.remaining).toBe(9);
    expect(p.rewardReady).toBe(false);
  });

  it('handles a fresh customer', () => {
    const p = loyaltyProgress(0, 10);
    expect(p.rewardReady).toBe(false);
    expect(p.remaining).toBe(10);
  });
});
