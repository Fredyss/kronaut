import { join } from 'node:path';

export const OWNER = {
  email: 'owner@kronaut.test',
  name: 'Ada Owner',
  workspace: 'Smoke Studio',
} as const;

export const CHANNEL = {
  handle: 'smoke.bsky.social',
  displayName: 'Smoke Bluesky',
} as const;

export const TIME_ZONE = 'Europe/Bratislava';

export const AUTH_FILE = join(import.meta.dirname, '.auth', 'owner.json');

export function fromEnv(name: 'E2E_BASE_URL' | 'E2E_SETUP_LINK'): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} is not set; run the specs through playwright.config.ts`);
  }
  return value;
}

export function appUrl(path: string): string {
  return new URL(path, fromEnv('E2E_BASE_URL')).href;
}
