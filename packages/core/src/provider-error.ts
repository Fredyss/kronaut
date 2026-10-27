import type { Temporal } from 'temporal-polyfill';

export type RateLimitScope = 'account' | 'app' | 'instance';

export type ProviderError =
  | { kind: 'transient'; detail?: string }
  | { kind: 'ambiguous'; detail?: string }
  | { kind: 'permanent'; code: string; detail?: string }
  | { kind: 'duplicate'; remoteId?: string }
  | { kind: 'rate_limited'; scope: RateLimitScope; resetAt: Temporal.Instant }
  | { kind: 'auth_expired' }
  | { kind: 'auth_revoked' }
  | { kind: 'app_config'; code: string; detail?: string };

function describe(error: ProviderError): string {
  return error.kind === 'permanent' || error.kind === 'app_config'
    ? `${error.kind}:${error.code}`
    : error.kind;
}

export class ProviderFailure extends Error {
  readonly error: ProviderError;

  constructor(error: ProviderError, options?: { cause?: unknown }) {
    super(`provider error: ${describe(error)}`, options);
    this.name = 'ProviderFailure';
    this.error = error;
  }
}

export function isProviderFailure(e: unknown): e is ProviderFailure {
  return e instanceof ProviderFailure;
}
