import { lastNDays, noShowRate } from '@/lib/analytics';

describe('lastNDays', () => {
  it('spans n days back from now', () => {
    const now = new Date('2026-06-29T12:00:00.000Z');
    const { from, to } = lastNDays(30, now);
    expect(to.toISOString()).toBe('2026-06-29T12:00:00.000Z');
    expect(from.toISOString()).toBe('2026-05-30T12:00:00.000Z');
  });
});

describe('noShowRate', () => {
  it('is a rounded percentage of total', () => {
    expect(noShowRate({ no_show: 1, total: 4 })).toBe(25);
    expect(noShowRate({ no_show: 2, total: 3 })).toBe(67);
  });
  it('is 0 for an empty range', () => {
    expect(noShowRate({ no_show: 0, total: 0 })).toBe(0);
  });
});
