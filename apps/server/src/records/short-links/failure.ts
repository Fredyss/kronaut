import { EgressError, type EgressErrorCode } from '@kronaut/egress';

export const SHORTENER_ERRORS = [
  'unauthorized',
  'refused',
  'rate_limited',
  'unavailable',
  'timed_out',
  'url_blocked',
  'conflict',
  'invalid_response',
] as const;

export type ShortenerError = (typeof SHORTENER_ERRORS)[number];

const RETRYABLE: ReadonlySet<ShortenerError> = new Set([
  'rate_limited',
  'unavailable',
  'timed_out',
]);

export class ShortenerFailed extends Error {
  readonly kind: ShortenerError;
  readonly retryable: boolean;

  constructor(kind: ShortenerError) {
    super(kind);
    this.name = 'ShortenerFailed';
    this.kind = kind;
    this.retryable = RETRYABLE.has(kind);
  }
}

const EGRESS_FAILURES: Readonly<Record<EgressErrorCode, ShortenerError>> = {
  blocked_address: 'url_blocked',
  blocked_host: 'url_blocked',
  blocked_scheme: 'url_blocked',
  blocked_port: 'url_blocked',
  too_many_redirects: 'url_blocked',
  response_too_large: 'invalid_response',
  timeout: 'timed_out',
  dns_failure: 'unavailable',
  network: 'unavailable',
};

// Egress and undici errors can carry the URL, and the request carried the key, so only the kind leaves.
export function classifyShortenerFailure(error: unknown, signal?: AbortSignal): ShortenerFailed {
  if (error instanceof ShortenerFailed) return error;
  if (signal?.aborted === true) return new ShortenerFailed('timed_out');
  if (error instanceof EgressError) return new ShortenerFailed(EGRESS_FAILURES[error.code]);
  return new ShortenerFailed('unavailable');
}

export function statusFailure(status: number): ShortenerFailed {
  if (status === 401 || status === 403) return new ShortenerFailed('unauthorized');
  if (status === 429) return new ShortenerFailed('rate_limited');
  if (status >= 500) return new ShortenerFailed('unavailable');
  return new ShortenerFailed('refused');
}
