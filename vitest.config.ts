import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{apps,packages}/*/src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
    exclude: ['**/*.db.test.ts', '**/node_modules/**'],
    passWithNoTests: true,
    // Node 24's V8 can double-free a wasm import wrapper during wasm code GC (nodejs/node#66366).
    execArgv: ['--no-wasm-code-gc'],
  },
});
