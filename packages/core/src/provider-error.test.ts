import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { isProviderFailure, type ProviderError, ProviderFailure } from './provider-error.ts';

const resetAt = Temporal.Instant.from('2026-10-21T12:00:00Z');

const CASES: readonly (readonly [string, ProviderError, string])[] = [
  ['transient', { kind: 'transient' }, 'provider error: transient'],
  ['ambiguous', { kind: 'ambiguous' }, 'provider error: ambiguous'],
  [
    'permanent',
    { kind: 'permanent', code: 'media_too_large' },
    'provider error: permanent:media_too_large',
  ],
  ['duplicate', { kind: 'duplicate' }, 'provider error: duplicate'],
  ['rate_limited', { kind: 'rate_limited', scope: 'app', resetAt }, 'provider error: rate_limited'],
  ['auth_expired', { kind: 'auth_expired' }, 'provider error: auth_expired'],
  ['auth_revoked', { kind: 'auth_revoked' }, 'provider error: auth_revoked'],
  [
    'app_config',
    { kind: 'app_config', code: 'client_secret' },
    'provider error: app_config:client_secret',
  ],
];

describe('ProviderFailure', () => {
  it.each(CASES)('formats the message for %s', (_name, error, message) => {
    expect(new ProviderFailure(error).message).toBe(message);
  });

  it('is an Error named ProviderFailure that carries the error', () => {
    const error: ProviderError = { kind: 'permanent', code: 'bad_media' };
    const failure = new ProviderFailure(error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toBeInstanceOf(ProviderFailure);
    expect(failure.name).toBe('ProviderFailure');
    expect(failure.error).toBe(error);
    expect(failure.stack).toContain('ProviderFailure');
  });

  it('never puts detail in the message', () => {
    const secret = 'token=abc123 user@example.com';
    const kinds: ProviderError[] = [
      { kind: 'transient', detail: secret },
      { kind: 'ambiguous', detail: secret },
      { kind: 'permanent', code: 'rejected', detail: secret },
      { kind: 'app_config', code: 'suspended', detail: secret },
    ];
    for (const error of kinds) {
      const failure = new ProviderFailure(error);
      expect(failure.message).not.toContain(secret);
      expect(failure.message).not.toContain('abc123');
      expect(String(failure)).not.toContain(secret);
      expect(failure.error).toBe(error);
    }
  });

  it('never puts remoteId in the message', () => {
    const failure = new ProviderFailure({ kind: 'duplicate', remoteId: 'at://did:plc:xyz/post/1' });
    expect(failure.message).toBe('provider error: duplicate');
    expect(failure.message).not.toContain('did:plc');
  });

  it('keeps the rate limit scope and reset instant on the error only', () => {
    const failure = new ProviderFailure({ kind: 'rate_limited', scope: 'instance', resetAt });
    expect(failure.message).not.toContain('instance');
    expect(failure.message).not.toContain('2026');
    if (failure.error.kind !== 'rate_limited') {
      throw new Error('unexpected kind');
    }
    expect(failure.error.scope).toBe('instance');
    expect(failure.error.resetAt.equals(resetAt)).toBe(true);
  });

  it('passes the cause through', () => {
    const cause = new Error('socket hang up');
    const failure = new ProviderFailure({ kind: 'transient' }, { cause });
    expect(failure.cause).toBe(cause);
  });

  it('has no cause when none is given', () => {
    expect('cause' in new ProviderFailure({ kind: 'transient' })).toBe(false);
    expect('cause' in new ProviderFailure({ kind: 'transient' }, {})).toBe(false);
  });

  it('keeps a non-error cause as given', () => {
    const failure = new ProviderFailure({ kind: 'auth_expired' }, { cause: 'plain text' });
    expect(failure.cause).toBe('plain text');
  });

  it('can be thrown and narrowed in a catch block', () => {
    const run = () => {
      throw new ProviderFailure({ kind: 'auth_revoked' });
    };
    try {
      run();
      expect.unreachable();
    } catch (e) {
      expect(isProviderFailure(e)).toBe(true);
      if (isProviderFailure(e)) {
        expect(e.error.kind).toBe('auth_revoked');
      }
    }
  });
});

describe('isProviderFailure', () => {
  it('accepts a ProviderFailure', () => {
    expect(isProviderFailure(new ProviderFailure({ kind: 'ambiguous' }))).toBe(true);
  });

  it('rejects plain errors and other values', () => {
    const impostor = Object.assign(new Error('provider error: transient'), {
      name: 'ProviderFailure',
      error: { kind: 'transient' },
    });
    for (const value of [
      new Error('x'),
      new TypeError('x'),
      impostor,
      { error: { kind: 'transient' } },
      { kind: 'transient' },
      'provider error: transient',
      null,
      undefined,
      0,
    ]) {
      expect(isProviderFailure(value)).toBe(false);
    }
  });
});
