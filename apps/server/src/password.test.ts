import { describe, expect, it } from 'vitest';
import { checkPassword, hashPassword, verifyPassword } from './password.ts';

describe('passwords', () => {
  it('hashes with argon2id at the OWASP baseline', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(stored, 'correct horse battery')).toBe(true);
    expect(await verifyPassword(stored, 'correct horse battery!')).toBe(false);
  });

  it('compares NFC-normalized text', async () => {
    const stored = await hashPassword('heslo-žluva-123');
    expect(await verifyPassword(stored, 'heslo-žluva-123')).toBe(true);
  });

  it('spends the same work on an unknown user', async () => {
    expect(await verifyPassword(null, 'anything at all')).toBe(false);
  });

  it('rejects malformed hashes without throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'anything at all')).toBe(false);
  });

  it('enforces length bounds', async () => {
    expect(checkPassword('short')).toBe('too_short');
    expect(checkPassword('x'.repeat(257))).toBe('too_long');
    expect(checkPassword('twelve chars')).toBeNull();
    await expect(hashPassword('short')).rejects.toThrow(RangeError);
  });
});
