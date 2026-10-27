import { EgressError } from './errors.ts';

const DNS_ERROR_CODES: ReadonlySet<string> = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'EAI_FAIL',
  'EAI_NODATA',
  'EAI_NONAME',
  'ENODATA',
  'ESERVFAIL',
]);
const TIMEOUT_ERROR_CODES: ReadonlySet<string> = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function findEgressError(error: unknown): EgressError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (current instanceof EgressError) {
      return current;
    }
    current = current.cause;
  }
  return undefined;
}

export function classifyError(
  error: unknown,
  timedOut: boolean,
  callerSignal: AbortSignal | undefined,
): unknown {
  if (error instanceof EgressError) {
    return error;
  }
  if (timedOut) {
    return new EgressError('timeout', 'request timed out', { cause: error });
  }
  if (callerSignal?.aborted) {
    return callerSignal.reason;
  }
  const nested = findEgressError(error);
  if (nested !== undefined) {
    return nested;
  }
  const code = errorCode(error);
  if (code !== undefined && DNS_ERROR_CODES.has(code)) {
    return new EgressError('dns_failure', 'dns resolution failed', { cause: error });
  }
  if (code !== undefined && TIMEOUT_ERROR_CODES.has(code)) {
    return new EgressError('timeout', 'request timed out', { cause: error });
  }
  return new EgressError('network', 'network error', { cause: error });
}
