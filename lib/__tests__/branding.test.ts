import { Colors } from '@/constants/theme';
import { mergeBranding } from '@/lib/branding';

describe('mergeBranding', () => {
  it('returns exact defaults when there are no overrides', () => {
    expect(mergeBranding(null, 'light')).toEqual(Colors.light);
    expect(mergeBranding(undefined, 'dark')).toEqual(Colors.dark);
    expect(mergeBranding({}, 'light')).toEqual(Colors.light);
    expect(mergeBranding({ light: {} }, 'light')).toEqual(Colors.light);
  });

  it('replaces only the overridden tokens', () => {
    const merged = mergeBranding({ light: { accent: '#FF0000' } }, 'light');
    expect(merged.accent).toBe('#FF0000');
    // Everything else stays at the default.
    expect(merged.background).toBe(Colors.light.background);
    expect(merged.text).toBe(Colors.light.text);
  });

  it('ignores unknown / non-overridable keys', () => {
    const merged = mergeBranding(
      { light: { accent: '#123456', bogus: '#000', text: '' } as Record<string, string> },
      'light'
    );
    expect(merged.accent).toBe('#123456');
    expect(merged).not.toHaveProperty('bogus');
    // Empty string is not a valid override — keep the default.
    expect(merged.text).toBe(Colors.light.text);
  });

  it('ignores partial / malformed hex (keeps the default)', () => {
    const merged = mergeBranding(
      { light: { accent: '#B', background: 'red', surface: '#12345', text: '#AABBCC' } },
      'light'
    );
    expect(merged.accent).toBe(Colors.light.accent); // too short
    expect(merged.background).toBe(Colors.light.background); // not hex
    expect(merged.surface).toBe(Colors.light.surface); // 5 digits
    expect(merged.text).toBe('#AABBCC'); // valid
  });

  it('keeps the two schemes independent', () => {
    const overrides = { light: { accent: '#AAA111' }, dark: { accent: '#BBB222' } };
    expect(mergeBranding(overrides, 'light').accent).toBe('#AAA111');
    expect(mergeBranding(overrides, 'dark').accent).toBe('#BBB222');
    // A light-only override must not bleed into dark.
    expect(mergeBranding({ light: { accent: '#AAA111' } }, 'dark').accent).toBe(Colors.dark.accent);
  });
});
