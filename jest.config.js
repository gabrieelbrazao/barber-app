/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Unit tests cover pure logic in lib/ plus render tests for the UI kit.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
