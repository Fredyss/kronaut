import type { ProviderError, StepEffect } from '@kronaut/core';
import { unexpectedResponse } from './failure.ts';

export interface StatusPolicy {
  readonly rateLimited: () => ProviderError;
  readonly known?: () => ProviderError | undefined;
  readonly unauthorized?: () => ProviderError;
  readonly clientError?: () => ProviderError;
  readonly serverDetail?: string;
  readonly otherStatus?: () => ProviderError;
}

function unknownClientError(status: number, effect: StepEffect): ProviderError {
  const detail = `http_${status}`;
  return effect === 'public'
    ? { kind: 'ambiguous', detail }
    : { kind: 'permanent', code: 'unexpected_status', detail };
}

export function statusFailure(
  status: number,
  effect: StepEffect,
  policy: StatusPolicy,
): ProviderError {
  const known = policy.known?.();
  if (known !== undefined) return known;
  if (status === 429) return policy.rateLimited();
  if (status === 401) return policy.unauthorized?.() ?? { kind: 'auth_expired' };
  if (status >= 400 && status < 500)
    return policy.clientError?.() ?? unknownClientError(status, effect);
  if (status >= 500) {
    const detail = policy.serverDetail ?? `http_${status}`;
    return { kind: effect === 'public' ? 'ambiguous' : 'transient', detail };
  }
  return policy.otherStatus?.() ?? unexpectedResponse(effect).error;
}
