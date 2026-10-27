import { randomBytes } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { purposeKey } from '../crypto.ts';
import { issueResetToken, passwordBinding, verifyResetToken } from './reset-token.ts';

const KEY = purposeKey(randomBytes(32), 'reset-token/v1');
const NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');
const USER = '01900000-0000-7000-8000-0000000000aa';

describe('reset token', () => {
  it('round-trips the user id and the password binding', () => {
    const token = issueResetToken(KEY, { userId: USER, passwordHash: 'hash-a', now: NOW });
    expect(token).toMatch(/^kro_rst_[A-Za-z0-9_-]+$/);
    const verified = verifyResetToken(KEY, token, NOW.add({ minutes: 14 }));
    expect(verified?.userId).toBe(USER);
    expect(verified?.binding.equals(passwordBinding('hash-a'))).toBe(true);
    expect(verified?.binding.equals(passwordBinding(null))).toBe(false);
  });

  it('rejects a tampered token and a token under another key', () => {
    const token = issueResetToken(KEY, { userId: USER, passwordHash: null, now: NOW });
    const body = Buffer.from(token.slice('kro_rst_'.length), 'base64url');
    body[20] = (body[20] ?? 0) ^ 1;
    expect(verifyResetToken(KEY, `kro_rst_${body.toString('base64url')}`, NOW)).toBeNull();
    const otherKey = purposeKey(randomBytes(32), 'reset-token/v1');
    expect(verifyResetToken(otherKey, token, NOW)).toBeNull();
    expect(verifyResetToken(KEY, `${token}A`, NOW)).toBeNull();
  });

  it('rejects a token at and after its expiry', () => {
    const token = issueResetToken(KEY, { userId: USER, passwordHash: null, now: NOW });
    expect(verifyResetToken(KEY, token, NOW.add({ minutes: 15 }))).toBeNull();
    expect(verifyResetToken(KEY, token, NOW.add({ hours: 1 }))).toBeNull();
  });
});
