import { apiError } from '@kronaut/contract';
import type { Logger } from 'pino';
import type { RouteCall, RouteReply } from '../request.ts';
import { IDEMPOTENCY_HEADER } from './idempotency.ts';
import type { Arrival } from './pipeline.ts';

export type Reentry = (arrival: Arrival) => Promise<Response>;

export interface Caller {
  readonly reenter: Reentry;
  readonly origin: string;
  readonly request: Request;
  readonly requestId: string;
  readonly logger: Logger;
}

const FORWARDED: readonly string[] = ['authorization', 'cf-access-jwt-assertion'];
const DOT_SEGMENTS: ReadonlySet<string> = new Set(['', '.', '..']);

function unsafeParams(call: RouteCall): readonly string[] {
  return call.route.path
    .split('/')
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1))
    .filter((name) => {
      const value = call.params[name];
      return value !== undefined && DOT_SEGMENTS.has(value);
    });
}

function routePath(call: RouteCall): string {
  return call.route.path
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment;
      const value = call.params[segment.slice(1)];
      if (value === undefined) throw new Error(`route ${call.route.id}: missing param ${segment}`);
      return encodeURIComponent(value);
    })
    .join('/');
}

function innerRequest(caller: Caller, call: RouteCall): Request {
  const path = routePath(call);
  const url = new URL(path, caller.origin);
  if (url.pathname !== path) throw new Error(`route ${call.route.id}: path resolved elsewhere`);
  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = caller.request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (call.idempotencyKey !== undefined) headers.set(IDEMPOTENCY_HEADER, call.idempotencyKey);
  if (call.body === undefined) return new Request(url, { method: call.route.method, headers });
  headers.set('content-type', 'application/json');
  return new Request(url, {
    method: call.route.method,
    headers,
    body: JSON.stringify(call.body),
  });
}

async function replyOf(response: Response): Promise<RouteReply> {
  const text = await response.text();
  const json = response.headers.get('content-type')?.startsWith('application/json') === true;
  let body: unknown;
  if (text !== '') body = json ? JSON.parse(text) : text;
  const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
  return {
    status: response.status,
    body,
    replayed: response.headers.get('idempotent-replayed') === 'true',
    ...(Number.isSafeInteger(retryAfter) ? { retryAfterSeconds: retryAfter } : {}),
  };
}

function refused(names: readonly string[]): RouteReply {
  const details = names.map((name) => ({ path: `params.${name}`, code: 'invalid_string' }));
  const body = apiError('invalid_request', 'A path parameter is empty or a dot segment.');
  return { status: 400, body: { error: { ...body.error, details } }, replayed: false };
}

export async function dispatchRoute(caller: Caller, call: RouteCall): Promise<RouteReply> {
  const unsafe = unsafeParams(call);
  if (unsafe.length > 0) return refused(unsafe);
  const response = await caller.reenter({
    request: innerRequest(caller, call),
    requestId: caller.requestId,
    logger: caller.logger,
    socket: null,
    ...(call.via === undefined ? {} : { via: call.via }),
    ...(call.idempotencyRetentionMs === undefined
      ? {}
      : { idempotencyRetentionMs: call.idempotencyRetentionMs }),
  });
  return await replyOf(response);
}
