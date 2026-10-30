import type { ProviderError } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { failureForStatus } from './status-failure.ts';

const limited: ProviderError = { kind: 'transient', detail: 'limited' };
const policy = { rateLimited: () => limited };

describe('failureForStatus defaults', () => {
  it('treats a 401 as expired, so the refresh path confirms it', () => {
    expect(failureForStatus(401, 'public', policy)).toEqual({ kind: 'auth_expired' });
  });

  it('keeps an unknown 4xx ambiguous on a public step', () => {
    expect(failureForStatus(404, 'public', policy)).toEqual({
      kind: 'ambiguous',
      detail: 'http_404',
    });
    expect(failureForStatus(404, 'private', policy)).toEqual({
      kind: 'permanent',
      code: 'unexpected_status',
      detail: 'http_404',
    });
  });

  it('retries a timed-out request only off a public step', () => {
    expect(failureForStatus(408, 'private', policy)).toEqual({
      kind: 'transient',
      detail: 'http_408',
    });
    expect(failureForStatus(425, 'public', policy)).toEqual({
      kind: 'ambiguous',
      detail: 'http_425',
    });
  });

  it('never treats a public 5xx as safe to retry', () => {
    expect(failureForStatus(500, 'public', policy)).toEqual({
      kind: 'ambiguous',
      detail: 'http_500',
    });
    expect(failureForStatus(500, 'private', policy)).toEqual({
      kind: 'transient',
      detail: 'http_500',
    });
  });

  it('uses the provider rate limit and lets known errors win', () => {
    expect(failureForStatus(429, 'public', policy)).toBe(limited);
    const known: ProviderError = { kind: 'duplicate' };
    expect(failureForStatus(429, 'public', { ...policy, known: () => known })).toBe(known);
  });

  it('treats any other status as an unexpected response', () => {
    expect(failureForStatus(302, 'public', policy)).toEqual({
      kind: 'ambiguous',
      detail: 'unexpected_response',
    });
  });
});
