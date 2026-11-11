import { createHmac } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import {
  returnWindowQuota,
  takeWindowQuota,
  type WindowQuota,
} from '../../infrastructure/quota/window-quota.ts';

export const LOGIN_FAILURES_PER_ADDRESS = 30;
export const LOGIN_FAILURES_PER_PAIR = 5;
export const LOGIN_FAILURES_PER_EMAIL = 100;

const SHORT_WINDOW_SECONDS = 15 * 60;
const EMAIL_WINDOW_SECONDS = 60 * 60;
// Callers without a readable address share one address, so they still have every limit.
const UNKNOWN_ADDRESS = 'unknown';

export interface LoginAttempt {
  readonly email: string;
  readonly ipPrefix: string | null;
}

export type LoginLimit = 'address' | 'pair' | 'email';

interface Bucket extends WindowQuota {
  readonly limit: LoginLimit;
}

function bucketKey(key: Uint8Array, scope: LoginLimit, value: string): string {
  const mac = createHmac('sha256', key).update(`${scope}\n${value}`, 'utf8').digest('base64url');
  return `endpoint:login:${scope}:${mac}`;
}

// Order matters: one address that runs out at its own or its pair bucket never reaches the
// email bucket, so it can't lock the account for everyone else.
function bucketsFor(key: Uint8Array, { email, ipPrefix }: LoginAttempt): Bucket[] {
  const address = ipPrefix ?? UNKNOWN_ADDRESS;
  return [
    {
      limit: 'address',
      key: bucketKey(key, 'address', address),
      capacity: LOGIN_FAILURES_PER_ADDRESS,
      windowSeconds: SHORT_WINDOW_SECONDS,
    },
    {
      limit: 'pair',
      key: bucketKey(key, 'pair', `${address}\n${email}`),
      capacity: LOGIN_FAILURES_PER_PAIR,
      windowSeconds: SHORT_WINDOW_SECONDS,
    },
    {
      limit: 'email',
      key: bucketKey(key, 'email', email),
      capacity: LOGIN_FAILURES_PER_EMAIL,
      windowSeconds: EMAIL_WINDOW_SECONDS,
    },
  ];
}

export interface LoginSlot {
  readonly blockedBy: LoginLimit | null;
  readonly keys: readonly string[];
}

// Every attempt takes its slot before the password is checked, so parallel guesses can't
// overshoot; a successful sign-in gives the slot back and only failures add up. A blocked
// attempt gives back what it took, or one locked account would use up its address's slots.
export async function takeLoginSlot(
  trx: TenantDb,
  key: Uint8Array,
  attempt: LoginAttempt,
): Promise<LoginSlot> {
  const keys: string[] = [];
  for (const bucket of bucketsFor(key, attempt)) {
    if (!(await takeWindowQuota(trx, bucket))) {
      await returnWindowQuota(trx, keys);
      return { blockedBy: bucket.limit, keys: [] };
    }
    keys.push(bucket.key);
  }
  return { blockedBy: null, keys };
}

export function returnLoginSlot(trx: TenantDb, slot: LoginSlot): Promise<void> {
  return returnWindowQuota(trx, slot.keys);
}
