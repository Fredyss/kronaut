import { describe, expect, it } from 'vitest';
import { constantTimeEqual, hmacToken, purposeKey, randomToken, TOKEN_PREFIX } from './crypto.ts';

const SECRET = new Uint8Array(32).fill(1);

describe('purposeKey', () => {
  it('derives a distinct 32-byte key per purpose', () => {
    const session = purposeKey(SECRET, 'session-token/v1');
    const review = purposeKey(SECRET, 'review-token/v1');
    expect(session).toHaveLength(32);
    expect(session.equals(purposeKey(SECRET, 'session-token/v1'))).toBe(true);
    expect(session.equals(review)).toBe(false);
  });
});

describe('tokens', () => {
  it('prefixes 256 bits of base64url', () => {
    const token = randomToken(TOKEN_PREFIX.session);
    expect(token).toMatch(/^kro_sess_[A-Za-z0-9_-]{43}$/);
    expect(randomToken(TOKEN_PREFIX.session)).not.toBe(token);
  });

  it('hashes per purpose', () => {
    const token = randomToken(TOKEN_PREFIX.session);
    const a = hmacToken(purposeKey(SECRET, 'session-token/v1'), token);
    const b = hmacToken(purposeKey(SECRET, 'reset-token/v1'), token);
    expect(a).toHaveLength(32);
    expect(constantTimeEqual(a, b)).toBe(false);
    expect(constantTimeEqual(a, hmacToken(purposeKey(SECRET, 'session-token/v1'), token))).toBe(
      true,
    );
    expect(constantTimeEqual(a, a.subarray(1))).toBe(false);
  });
});
