import type { ResponseEncoding } from '@kronaut/contract';
import type { Logger } from 'pino';
import { errorBody, HttpError } from './errors.ts';

const GENERIC_FAILURE = 'Something went wrong. Try again later.';

export function headersFor(requestId: string, hsts: boolean): Headers {
  const headers = new Headers({
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId,
  });
  if (hsts) headers.set('Strict-Transport-Security', 'max-age=31536000');
  return headers;
}

export function respond(
  status: number,
  body: unknown,
  headers: Headers,
  encoding: ResponseEncoding = 'json',
): Response {
  if (status === 204 || body === undefined) return new Response(null, { status, headers });
  if (encoding === 'text') {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    return new Response(String(body), { status, headers });
  }
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

export function failure(err: unknown, requestId: string, logger: Logger, hsts: boolean): Response {
  if (err instanceof HttpError && err.code !== 'internal') {
    return respond(err.status, errorBody(err, requestId), headersFor(requestId, hsts));
  }
  logger.error({ err, requestId }, 'request failed');
  const internal = new HttpError('internal', GENERIC_FAILURE);
  return respond(500, errorBody(internal, requestId), headersFor(requestId, hsts));
}
