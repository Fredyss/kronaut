import type { IncomingHttpHeaders } from 'node:http';
import { type Dispatcher, request as undiciRequest } from 'undici';
import { classifyError } from './classify-error.ts';
import { type Deadline, raceAbort, startDeadline } from './deadline.ts';
import { EgressError } from './errors.ts';
import { assertAllowed, type EgressPolicy, parseUrl } from './policy.ts';
import { followRedirect, type Hop, REDIRECT_STATUSES, type RedirectMode } from './redirect.ts';

export interface EgressRequest {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  signal?: AbortSignal;
  sensitiveHeaders?: readonly string[];
}

export interface RawResponse {
  status: number;
  headers: Headers;
  url: string;
  redirected: boolean;
  hasBody: boolean;
  chunks: AsyncIterable<Uint8Array>;
  discard(): void;
}

export interface PerformRequestOptions {
  readonly policy: EgressPolicy;
  readonly dispatcher: Dispatcher;
  readonly input: string | URL;
  readonly init: EgressRequest;
  readonly redirect?: RedirectMode;
}

interface Arrival {
  readonly response: Dispatcher.ResponseData;
  readonly hop: Hop;
  readonly limit: number;
  readonly deadline: Deadline;
  readonly fail: (error: unknown) => unknown;
}

export const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 204, 205, 304]);

function noop(): void {}

function toHeaders(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  try {
    for (const [name, value] of Object.entries(raw)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(name, item);
        }
      } else {
        headers.append(name, value);
      }
    }
  } catch (cause) {
    throw new EgressError('network', 'malformed response headers', { cause });
  }
  return headers;
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function send(dispatcher: Dispatcher, hop: Hop, signal: AbortSignal) {
  return raceAbort(
    undiciRequest(hop.url, {
      dispatcher,
      method: hop.method,
      headers: Object.fromEntries(hop.headers),
      body: hop.body ?? null,
      signal,
    }),
    signal,
    (late) => {
      late.body.on('error', noop);
      late.body.destroy();
    },
  );
}

function toRawResponse({ response, hop, limit, deadline, fail }: Arrival): RawResponse {
  const status = response.statusCode;
  const contentLength = Number(singleHeader(response.headers['content-length']));
  const hasBody = hop.method !== 'HEAD' && !NULL_BODY_STATUSES.has(status);
  if (hasBody && contentLength > limit) {
    throw new EgressError('response_too_large', 'response exceeds the size limit');
  }

  const stream = response.body;
  const rawHeaders = toHeaders(response.headers);
  const chunks = (async function* (): AsyncGenerator<Uint8Array> {
    try {
      let total = 0;
      for await (const chunk of stream) {
        total += chunk.byteLength;
        if (total > limit) {
          throw new EgressError('response_too_large', 'response exceeds the size limit');
        }
        yield chunk;
      }
    } catch (error) {
      throw fail(error);
    } finally {
      clearTimeout(deadline.timer);
    }
  })();
  return {
    status,
    headers: rawHeaders,
    url: hop.url.href,
    redirected: hop.redirects > 0,
    hasBody,
    chunks,
    discard: () => {
      clearTimeout(deadline.timer);
      stream.destroy();
    },
  };
}

export async function performRequest({
  policy,
  dispatcher,
  input,
  init,
  redirect = 'follow',
}: PerformRequestOptions): Promise<RawResponse> {
  const callerSignal = init.signal;
  callerSignal?.throwIfAborted();
  const url = parseUrl(input);
  const deadline = startDeadline(policy.timeoutMs, callerSignal);
  const fail = (error: unknown): unknown => classifyError(error, deadline.timedOut(), callerSignal);

  const sensitive = new Set((init.sensitiveHeaders ?? []).map((name) => name.toLowerCase()));
  const headers = new Map<string, string>();
  for (const [name, value] of Object.entries(init.headers ?? {})) {
    headers.set(name.toLowerCase(), value);
  }
  const method = (init.method ?? 'GET').toUpperCase();
  const hop: Hop = { url, method, body: init.body, headers, redirects: 0 };
  const rules = { mode: redirect, maxRedirects: policy.maxRedirects, sensitive };

  let responseBody: Dispatcher.ResponseData['body'] | undefined;
  try {
    for (;;) {
      assertAllowed(hop.url, policy);
      const response = await send(dispatcher, hop, deadline.signal);
      responseBody = response.body;
      responseBody.on('error', noop);
      deadline.signal.throwIfAborted();

      const status = response.statusCode;
      const location = singleHeader(response.headers.location);
      if (REDIRECT_STATUSES.has(status) && location !== undefined && redirect !== 'manual') {
        responseBody.destroy();
        responseBody = undefined;
        followRedirect(hop, status, location, rules);
        continue;
      }

      return toRawResponse({ response, hop, limit: policy.maxResponseBytes, deadline, fail });
    }
  } catch (error) {
    clearTimeout(deadline.timer);
    responseBody?.destroy();
    throw fail(error);
  }
}
