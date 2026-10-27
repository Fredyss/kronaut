import type { Transform } from 'node:stream';
import type { Dispatcher } from 'undici';
import { contentDecoders, decodeChunks } from './decode.ts';
import {
  type EgressRequest,
  NULL_BODY_STATUSES,
  performRequest,
  type RawResponse,
} from './perform-request.ts';
import { assertAllowed, type EgressPolicy, parseUrl } from './policy.ts';

function toFetchResponse(raw: RawResponse, limit: number): Response {
  let response: Response;
  if (NULL_BODY_STATUSES.has(raw.status)) {
    raw.discard();
    response = new Response(null, { status: raw.status, headers: raw.headers });
  } else {
    let headers = raw.headers;
    let chunks = raw.chunks;
    let decoders: (() => Transform)[];
    try {
      decoders = raw.hasBody ? contentDecoders(raw.headers) : [];
    } catch (error) {
      raw.discard();
      throw error;
    }
    if (decoders.length > 0) {
      headers = new Headers(raw.headers);
      headers.delete('content-encoding');
      headers.delete('content-length');
      chunks = decodeChunks(raw.chunks, decoders, limit, raw.discard);
    }
    response = new Response(ReadableStream.from(chunks), { status: raw.status, headers });
  }
  Object.defineProperty(response, 'url', { value: raw.url });
  Object.defineProperty(response, 'redirected', { value: raw.redirected });
  return response;
}

// A Request follows the caller's signal only through a WeakRef, so once the wrapper is
// collected an abort no longer reaches it; follow the caller's own signal instead.
function callerSignal(
  input: string | URL | Request,
  init: RequestInit | undefined,
): AbortSignal | undefined {
  if (init?.signal !== undefined) return init.signal ?? undefined;
  return input instanceof Request ? input.signal : undefined;
}

export async function fetchAdapter(
  policy: EgressPolicy,
  dispatcher: Dispatcher,
  input: string | URL | Request,
  init: RequestInit | undefined,
): Promise<Response> {
  const target = input instanceof Request ? input.url : input;
  assertAllowed(parseUrl(target), policy);
  const prepared = new Request(input, init);
  const headers: Record<string, string> = {};
  for (const [name, value] of prepared.headers) {
    headers[name] = value;
  }
  const request: EgressRequest = { method: prepared.method, headers };
  const signal = callerSignal(input, init);
  if (signal !== undefined) request.signal = signal;
  if (prepared.body !== null) {
    request.body = new Uint8Array(await prepared.arrayBuffer());
  }
  const raw = await performRequest({
    policy,
    dispatcher,
    input: prepared.url,
    init: request,
    redirect: prepared.redirect,
  });
  return toFetchResponse(raw, policy.maxResponseBytes);
}
