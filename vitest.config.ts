import { defineConfig } from 'vitest/config';

// Unit tests for the judging logic in lib/ (no browser needed). Run with `npm test`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
