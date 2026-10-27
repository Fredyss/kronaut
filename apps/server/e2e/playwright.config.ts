import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE, TIME_ZONE } from './env.ts';

const CI = process.env.CI !== undefined && process.env.CI !== '';

export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: '*.e2e.ts',
  globalSetup: './global-setup.ts',
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: 0,
  reporter: CI ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    locale: 'en-US',
    timezoneId: TIME_ZONE,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'account', testMatch: 'account.e2e.ts' },
    {
      name: 'app',
      testIgnore: 'account.e2e.ts',
      dependencies: ['account'],
      use: { storageState: AUTH_FILE },
    },
  ],
});
