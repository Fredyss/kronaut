import { type ProviderError, ProviderFailure, type StepEffect } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { toProviderFailure, unexpectedResponse } from './failure.ts';
import { egressError } from './testing.ts';

const CASES: readonly (readonly [string, StepEffect, ProviderError])[] = [
  ['timeout', 'private', { kind: 'transient', detail: 'timeout' }],
  ['network', 'none', { kind: 'transient', detail: 'network' }],
  ['dns_failure', 'private', { kind: 'transient', detail: 'dns_failure' }],
  [
    'blocked_address',
    'private',
    { kind: 'permanent', code: 'egress_blocked', detail: 'blocked_address' },
  ],
  ['blocked_host', 'none', { kind: 'permanent', code: 'egress_blocked', detail: 'blocked_host' }],
  ['too_many_redirects', 'private', { kind: 'permanent', code: 'egress_too_many_redirects' }],
  ['response_too_large', 'private', { kind: 'permanent', code: 'egress_response_too_large' }],
  ['timeout', 'public', { kind: 'ambiguous', detail: 'timeout' }],
  ['network', 'public', { kind: 'ambiguous', detail: 'network' }],
  ['dns_failure', 'public', { kind: 'ambiguous', detail: 'dns_failure' }],
  ['blocked_address', 'public', { kind: 'ambiguous', detail: 'blocked_address' }],
  ['response_too_large', 'public', { kind: 'ambiguous', detail: 'response_too_large' }],
];

describe('toProviderFailure', () => {
  it.each(CASES)('maps egress %s on a %s step', (code, effect, expected) => {
    const cause = egressError(code);
    const failure = toProviderFailure(cause, effect);
    expect(failure.error).toEqual(expected);
    expect(failure.cause).toBe(cause);
  });

  it('passes a ProviderFailure through unchanged', () => {
    const failure = new ProviderFailure({ kind: 'auth_expired' });
    expect(toProviderFailure(failure, 'public')).toBe(failure);
  });

  it('treats an unknown error as transient on a private step', () => {
    expect(toProviderFailure(new TypeError('boom'), 'private').error).toEqual({
      kind: 'transient',
      detail: 'TypeError',
    });
  });

  it('treats an unknown error as ambiguous on a public step', () => {
    expect(toProviderFailure('boom', 'public').error).toEqual({
      kind: 'ambiguous',
      detail: 'unknown',
    });
  });

  it('ignores a code on an error that is not an egress error', () => {
    const error = Object.assign(new Error('x'), { code: 'blocked_host' });
    expect(toProviderFailure(error, 'private').error).toEqual({
      kind: 'transient',
      detail: 'Error',
    });
  });
});

describe('unexpectedResponse', () => {
  it('is permanent on a private step', () => {
    expect(unexpectedResponse('private').error).toEqual({
      kind: 'permanent',
      code: 'unexpected_response',
    });
  });

  it('is ambiguous on a public step', () => {
    expect(unexpectedResponse('public').error).toEqual({
      kind: 'ambiguous',
      detail: 'unexpected_response',
    });
  });
});
