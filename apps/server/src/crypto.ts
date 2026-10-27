import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export type KeyPurpose =
  | 'session-token/v1'
  | 'grant-token/v1'
  | 'review-token/v1'
  | 'reset-token/v1'
  | 'oauth-state/v1'
  | 'oauth-pending/v1';

export const TOKEN_PREFIX = {
  session: 'kro_sess_',
  review: 'kro_rvw_',
  reset: 'kro_rst_',
} as const;

const KEY_BYTES = 32;
const TOKEN_BYTES = 32;
const EMPTY_SALT = new Uint8Array(0);

export function purposeKey(secret: Uint8Array, purpose: KeyPurpose): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, EMPTY_SALT, `kronaut/${purpose}`, KEY_BYTES));
}

export function randomToken(prefix: string): string {
  return `${prefix}${randomBytes(TOKEN_BYTES).toString('base64url')}`;
}

export function hmacToken(key: Uint8Array, token: string): Buffer {
  return createHmac('sha256', key).update(token, 'utf8').digest();
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
