describe('SHOP_ID config', () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_SHOP_ID;
  afterEach(() => {
    process.env.EXPO_PUBLIC_SHOP_ID = ORIGINAL;
    jest.resetModules();
  });

  it('exposes EXPO_PUBLIC_SHOP_ID as SHOP_ID', () => {
    process.env.EXPO_PUBLIC_SHOP_ID = '11111111-1111-1111-1111-111111111111';
    jest.isolateModules(() => {
      const { SHOP_ID } = require('@/lib/config');
      expect(SHOP_ID).toBe('11111111-1111-1111-1111-111111111111');
    });
  });

  it('throws a helpful error when SHOP_ID is missing', () => {
    delete process.env.EXPO_PUBLIC_SHOP_ID;
    jest.isolateModules(() => {
      expect(() => require('@/lib/config')).toThrow(/EXPO_PUBLIC_SHOP_ID/);
    });
  });
});
