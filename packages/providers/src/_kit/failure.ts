import { isProviderFailure, ProviderFailure, type StepEffect } from '@kronaut/core';

function egressCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || error.name !== 'EgressError') return undefined;
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export function toProviderFailure(error: unknown, effect: StepEffect): ProviderFailure {
  if (isProviderFailure(error)) return error;
  const code = egressCode(error);
  const detail = code ?? (error instanceof Error ? error.name : 'unknown');
  // a redirect hop can fail after the first request was delivered, so no error is safe on a public step
  if (effect === 'public')
    return new ProviderFailure({ kind: 'ambiguous', detail }, { cause: error });
  if (code?.startsWith('blocked_'))
    return new ProviderFailure(
      { kind: 'permanent', code: 'egress_blocked', detail },
      { cause: error },
    );
  if (code === 'too_many_redirects' || code === 'response_too_large')
    return new ProviderFailure({ kind: 'permanent', code: `egress_${code}` }, { cause: error });
  return new ProviderFailure({ kind: 'transient', detail }, { cause: error });
}

export function unexpectedResponse(effect: StepEffect, cause?: unknown): ProviderFailure {
  return new ProviderFailure(
    effect === 'public'
      ? { kind: 'ambiguous', detail: 'unexpected_response' }
      : { kind: 'permanent', code: 'unexpected_response' },
    { cause },
  );
}
