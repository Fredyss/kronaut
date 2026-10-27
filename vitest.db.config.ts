import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{apps,packages}/*/src/**/*.db.test.ts'],
    passWithNoTests: true,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
