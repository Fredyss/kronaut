import { type ByteRange, type MediaStore, verifyMediaRequest } from '@kronaut/media';
import { Hono } from 'hono';
import type { Temporal } from 'temporal-polyfill';
import { SNIFF_HEAD_BYTES } from './sniff.ts';
import { detectServedMime } from './sniff-mp4.ts';

export interface MediaServerDeps {
  readonly store: MediaStore;
  readonly signingKey: Uint8Array;
  readonly clock: () => Temporal.Instant;
}

const SIGNING_KEY_BYTES = 32;
const MAX_CACHE_SECONDS = 3600;

type Chunks = AsyncIterator<Buffer | string>;

const RANGE_RE = /^bytes=(\d*)-(\d*)$/;

function toBuffer(chunk: Buffer | string): Buffer {
  return typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
}

async function readHead(chunks: Chunks): Promise<Buffer[]> {
  const head: Buffer[] = [];
  let length = 0;
  while (length < SNIFF_HEAD_BYTES) {
    const next = await chunks.next();
    if (next.done === true) break;
    const chunk = toBuffer(next.value);
    head.push(chunk);
    length += chunk.byteLength;
  }
  return head;
}

function bodyStream(head: Buffer[], chunks: Chunks): ReadableStream<Uint8Array> {
  const pending = [...head];
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const buffered = pending.shift();
      if (buffered !== undefined) {
        controller.enqueue(buffered);
        return;
      }
      const next = await chunks.next();
      if (next.done === true) controller.close();
      else controller.enqueue(toBuffer(next.value));
    },
    async cancel() {
      await chunks.return?.();
    },
  });
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: { 'X-Content-Type-Options': 'nosniff' } });
}

function parseRange(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | null {
  const match = header === undefined ? null : RANGE_RE.exec(header);
  if (match === null) return null;
  const [, first = '', last = ''] = match;
  if (first === '') {
    if (last === '') return null;
    const suffix = Number(last);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(first);
  const end = last === '' ? Number.POSITIVE_INFINITY : Number(last);
  if (end < start) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end: Math.min(end, size - 1) };
}

function unsatisfiable(size: number): Response {
  return new Response(null, {
    status: 416,
    headers: { 'X-Content-Type-Options': 'nosniff', 'Content-Range': `bytes */${size}` },
  });
}

function lengthHeaders(range: ByteRange | null, size: number): Record<string, string> {
  if (range === null) return { 'Content-Length': String(size) };
  return {
    'Content-Length': String(range.end - range.start + 1),
    'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
  };
}

async function rangeResponse(
  store: MediaStore,
  key: string,
  range: ByteRange,
  headers: Record<string, string>,
): Promise<Response> {
  const slice = await store.open(key, range);
  if (slice === null) return notFound();
  return new Response(bodyStream([], slice.stream[Symbol.asyncIterator]()), {
    status: 206,
    headers,
  });
}

interface ServeRequest {
  readonly store: MediaStore;
  readonly key: string;
  readonly opened: { readonly stream: NodeJS.ReadableStream; readonly size: number };
  readonly method: string;
  readonly rangeHeader: string | undefined;
  readonly maxAge: number;
}

function objectHeaders(mime: string, range: ByteRange | null, request: ServeRequest) {
  return {
    'Content-Type': mime,
    ...lengthHeaders(range, request.opened.size),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': `private, max-age=${request.maxAge}`,
  };
}

async function serveObject(request: ServeRequest): Promise<Response> {
  const { opened } = request;
  const chunks: Chunks = opened.stream[Symbol.asyncIterator]();
  let streaming = false;
  try {
    const head = await readHead(chunks);
    const mime = detectServedMime(Buffer.concat(head));
    if (mime === null) return notFound();
    const range = parseRange(request.rangeHeader, opened.size);
    if (range === 'unsatisfiable') return unsatisfiable(opened.size);
    const headers = objectHeaders(mime, range, request);
    if (request.method === 'HEAD') {
      return new Response(null, { status: range === null ? 200 : 206, headers });
    }
    if (range !== null) {
      await chunks.return?.();
      return await rangeResponse(request.store, request.key, range, headers);
    }
    streaming = true;
    return new Response(bodyStream(head, chunks), { status: 200, headers });
  } finally {
    if (!streaming) await chunks.return?.();
  }
}

export function createMediaServer(deps: MediaServerDeps): Hono {
  if (
    !(deps.signingKey instanceof Uint8Array) ||
    deps.signingKey.byteLength !== SIGNING_KEY_BYTES
  ) {
    throw new TypeError('media signing key must be 32 bytes');
  }
  const app = new Hono();

  app.get('*', async (c) => {
    const url = new URL(c.req.url);
    const nowSeconds = deps.clock().epochMilliseconds / 1000;
    const verified = verifyMediaRequest(deps.signingKey, url.pathname, url.search, nowSeconds);
    if (!verified.ok) return notFound();
    const exp = Number(url.searchParams.get('exp'));

    const opened = await deps.store.open(verified.storageKey);
    if (opened === null) return notFound();
    return serveObject({
      store: deps.store,
      key: verified.storageKey,
      opened,
      method: c.req.method,
      rangeHeader: c.req.header('range'),
      maxAge: Math.min(Math.max(Math.floor(exp - nowSeconds), 0), MAX_CACHE_SECONDS),
    });
  });

  app.notFound(() => notFound());
  app.onError(
    () => new Response(null, { status: 500, headers: { 'X-Content-Type-Options': 'nosniff' } }),
  );
  return app;
}
