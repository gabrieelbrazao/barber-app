/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Unit tests focus on pure logic in lib/ and contexts/ (see TDD strategy).
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
