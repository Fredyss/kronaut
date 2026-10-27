import type { ApiError, ApiErrorCode } from '@kronaut/contract';
import { type Client, createClient, createConfig } from './gen/client/index.ts';
import type { ClientOptions } from './gen/types.gen.ts';

export type { ApiError, ApiErrorCode } from '@kronaut/contract';
export type { Client } from './gen/client/index.ts';
export * from './gen/index.ts';

const FALLBACK_CODES: Readonly<Record<number, ApiErrorCode>> = {
  400: 'invalid_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'unprocessable',
  428: 'idempotency_key_required',
  429: 'rate_limited',
  503: 'unavailable',
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.error.message === '' ? body.error.code : body.error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }

  get code(): string {
    return this.body.error.code;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

type ApiErrorDetail = NonNullable<ApiError['error']['details']>[number];

function isDetail(value: unknown): value is ApiErrorDetail {
  return isRecord(value) && typeof value.path === 'string' && typeof value.code === 'string';
}

export function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  const { code, message, requestId, details } = value.error;
  return (
    typeof code === 'string' &&
    typeof message === 'string' &&
    (requestId === undefined || typeof requestId === 'string') &&
    (details === undefined || (Array.isArray(details) && details.every(isDetail)))
  );
}

export function toApiRequestError(raw: unknown, status: number): ApiRequestError {
  if (raw instanceof ApiRequestError) return raw;
  if (isApiError(raw)) {
    const { code, message, requestId, details } = raw.error;
    const error = {
      code,
      message,
      ...(requestId === undefined ? {} : { requestId }),
      ...(details === undefined
        ? {}
        : { details: details.map(({ path, code }) => ({ path, code })) }),
    };
    return new ApiRequestError(status, { error });
  }
  const code = status === 0 ? 'unavailable' : (FALLBACK_CODES[status] ?? 'internal');
  return new ApiRequestError(status, { error: { code, message: '' } });
}

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: ApiClientOptions = {}): Client {
  const client = createClient(
    createConfig<ClientOptions>({
      baseUrl: options.baseUrl ?? '',
      credentials: 'same-origin',
      throwOnError: true,
      fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
    }),
  );
  client.interceptors.error.use((error, response) =>
    toApiRequestError(error, response?.status ?? 0),
  );
  return client;
}
