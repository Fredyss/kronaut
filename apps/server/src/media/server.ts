import { type MediaStore, verifyMediaRequest } from '@kronaut/media';
import { Hono } from 'hono';
import type { Temporal } from 'temporal-polyfill';
import { detectImageFormat, IMAGE_MIME, SNIFF_HEAD_BYTES } from './sniff.ts';

export interface MediaServerDeps {
  readonly store: MediaStore;
  readonly signingKey: Uint8Array;
  readonly clock: () => Temporal.Instant;
}

const SIGNING_KEY_BYTES = 32;
const MAX_CACHE_SECONDS = 3600;

type Chunks = AsyncIterator<Buffer | string>;

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
    const chunks: Chunks = opened.stream[Symbol.asyncIterator]();
    let streaming = false;
    try {
      const head = await readHead(chunks);
      const format = detectImageFormat(Buffer.concat(head));
      if (format === null) return notFound();
      const headers = {
        'Content-Type': IMAGE_MIME[format],
        'Content-Length': String(opened.size),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': `private, max-age=${Math.min(Math.max(Math.floor(exp - nowSeconds), 0), MAX_CACHE_SECONDS)}`,
      };
      if (c.req.method === 'HEAD') return new Response(null, { status: 200, headers });
      streaming = true;
      return new Response(bodyStream(head, chunks), { status: 200, headers });
    } finally {
      if (!streaming) await chunks.return?.();
    }
  });

  app.notFound(() => notFound());
  app.onError(
    () => new Response(null, { status: 500, headers: { 'X-Content-Type-Options': 'nosniff' } }),
  );
  return app;
}
