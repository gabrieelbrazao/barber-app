import { formatDuration, formatPrice, maskPhoneBR } from '@/lib/format';

describe('formatPrice', () => {
  it('formats cents as BRL with a comma decimal', () => {
    expect(formatPrice(3500)).toBe('R$ 35,00');
    expect(formatPrice(1599)).toBe('R$ 15,99');
    expect(formatPrice(0)).toBe('R$ 0,00');
  });
});

describe('formatDuration', () => {
  it('uses minutes under an hour', () => {
    expect(formatDuration(20)).toBe('20 min');
    expect(formatDuration(45)).toBe('45 min');
  });
  it('uses hours (and minutes) at or above an hour', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(125)).toBe('2h 5m');
  });
});

describe('maskPhoneBR', () => {
  it('progressively masks a BR mobile number and caps at 11 digits', () => {
    expect(maskPhoneBR('')).toBe('');
    expect(maskPhoneBR('11')).toBe('(11');
    expect(maskPhoneBR('1199')).toBe('(11) 99');
    expect(maskPhoneBR('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhoneBR('119999988889999')).toBe('(11) 99999-8888');
  });
  it('formats a 10-digit landline', () => {
    expect(maskPhoneBR('1133334444')).toBe('(11) 3333-4444');
  });
  it('ignores non-digits', () => {
    expect(maskPhoneBR('a1b1c9')).toBe('(11) 9');
  });
});
