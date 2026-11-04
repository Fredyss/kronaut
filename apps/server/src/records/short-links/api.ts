import type { EgressPolicy, HttpClient } from '@kronaut/egress';
import type * as z from 'zod';
import { classifyShortenerFailure, ShortenerFailed, statusFailure } from './failure.ts';

export const SHORTENER_EGRESS: EgressPolicy = {
  allowedHosts: 'any',
  maxResponseBytes: 256 * 1024,
  timeoutMs: 10_000,
  maxRedirects: 0,
};

const SHORT_URL_MAX = 2048;

export interface ApiCall {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly auth: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

export interface ApiReply {
  readonly status: number;
  readonly body: unknown;
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function send(http: HttpClient, call: ApiCall, signal?: AbortSignal): Promise<ApiReply> {
  const response = await http.request(call.url, {
    method: call.method,
    headers: {
      accept: 'application/json',
      'user-agent': 'Kronaut link shortener',
      ...(call.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...call.auth,
    },
    ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
    sensitiveHeaders: Object.keys(call.auth),
    ...(signal === undefined ? {} : { signal }),
  });
  try {
    return { status: response.status, body: parsed(await response.text()) };
  } finally {
    response.discard();
  }
}

export async function callApi(
  http: HttpClient,
  call: ApiCall,
  signal?: AbortSignal,
): Promise<ApiReply> {
  try {
    return await send(http, call, signal);
  } catch (error) {
    throw classifyShortenerFailure(error, signal);
  }
}

export function ok(reply: ApiReply): void {
  if (reply.status < 200 || reply.status > 299) throw statusFailure(reply.status);
}

export function bodyOf<T extends z.ZodType>(schema: T, reply: ApiReply): z.output<T> {
  ok(reply);
  const result = schema.safeParse(reply.body);
  if (!result.success) throw new ShortenerFailed('invalid_response');
  return result.data;
}

export function shortUrl(value: string): string {
  const url = value.length > SHORT_URL_MAX ? null : URL.parse(value);
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new ShortenerFailed('invalid_response');
  }
  return value;
}
