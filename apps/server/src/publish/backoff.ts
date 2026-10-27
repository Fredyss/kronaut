import { randomInt } from 'node:crypto';

export type RandomInt = (min: number, max: number) => number;

export const BACKOFF_BASE_MS = 30_000;
export const BACKOFF_CAP_MS = 30 * 60_000;

export function backoffCapMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt - 1, 16));
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** exponent);
}

export function backoffMs(attempt: number, random: RandomInt = randomInt): number {
  return random(0, backoffCapMs(attempt) + 1);
}
