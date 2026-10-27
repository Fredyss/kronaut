import { randomBytes } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import type { Database } from '@kronaut/db';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { createHttpApp, deriveHttpKeys } from './kernel.ts';
import { bindRoute } from './types.ts';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const partRoute = defineRoute({
  id: 'probe.part',
  method: 'PUT',
  path: '/v1/probe/part',
  auth: 'public',
  action: null,
  body: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength > 0),
  bodyEncoding: 'octet-stream',
  idempotency: false,
  response: z.object({ size: z.number(), first: z.number() }),
  summary: 'Part',
});

function setup() {
  const app = createHttpApp(
    {
      db: unusedDb,
      keys: deriveHttpKeys(randomBytes(32)),
      logger: pino({ level: 'silent' }),
      clock: () => Temporal.Instant.from('2026-10-21T10:00:00Z'),
      publicBaseUrl: 'https://kronaut.example.test',
      readiness: async () => true,
      maxBodyBytes: 1024,
      routeBodyLimits: { 'probe.part': 4096 },
    },
    [
      bindRoute(partRoute, async ({ body }) => ({
        body: { size: body.byteLength, first: body[0] ?? -1 },
      })),
    ],
  );
  return app;
}

function put(body: Uint8Array<ArrayBuffer>, contentType: string | null): RequestInit {
  return {
    method: 'PUT',
    headers: contentType === null ? {} : { 'content-type': contentType },
    body,
  };
}

async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

describe('octet-stream bodies', () => {
  it('passes the raw bytes to the handler under the route limit', async () => {
    const bytes = new Uint8Array(3000).fill(7);
    const response = await setup().request(
      '/v1/probe/part',
      put(bytes, 'application/octet-stream'),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ size: 3000, first: 7 });
  });

  it('accepts media type parameters and case', async () => {
    const response = await setup().request(
      '/v1/probe/part',
      put(new Uint8Array([1]), 'Application/Octet-Stream; foo=bar'),
    );
    expect(response.status).toBe(200);
  });

  it.each(['application/json', 'application/octet-streamx', null])(
    'rejects content type %j with 415',
    async (contentType) => {
      const response = await setup().request(
        '/v1/probe/part',
        put(new Uint8Array([1]), contentType),
      );
      expect(response.status).toBe(415);
      expect(await errorCode(response)).toBe('unsupported_media_type');
    },
  );

  it('rejects an empty body through the schema', async () => {
    const response = await setup().request(
      '/v1/probe/part',
      put(new Uint8Array(0), 'application/octet-stream'),
    );
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe('invalid_request');
  });

  it('rejects a body over the route limit with 413', async () => {
    const response = await setup().request(
      '/v1/probe/part',
      put(new Uint8Array(5000), 'application/octet-stream'),
    );
    expect(response.status).toBe(413);
  });
});
