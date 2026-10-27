import { randomBytes } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import type { Database } from '@kronaut/db';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { AccessGate } from './access.ts';
import { denyError } from './errors.ts';
import { accessExempt, createHttpApp, deriveHttpKeys, type HttpDeps } from './kernel.ts';
import { createRouter } from './router.ts';
import { systemRoutes } from './system-routes.ts';
import { type BoundRoute, bindRoute } from './types.ts';

const NOW = Temporal.Instant.from('2026-10-21T10:00:00Z');
const BASE = 'https://kronaut.example.test';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const echoRoute = defineRoute({
  id: 'probe.echo',
  method: 'POST',
  path: '/v1/probe/echo',
  auth: 'public',
  action: null,
  body: z.object({ text: z.string() }),
  response: z.object({ text: z.string() }),
  summary: 'Echo',
});

const uploadRoute = defineRoute({
  id: 'probe.upload',
  method: 'POST',
  path: '/v1/probe/upload',
  auth: 'public',
  action: null,
  body: z.object({ data: z.string() }),
  response: z.object({ size: z.number() }),
  summary: 'Upload',
});

const boomRoute = defineRoute({
  id: 'probe.boom',
  method: 'GET',
  path: '/v1/probe/boom',
  auth: 'public',
  action: null,
  response: z.object({}),
  summary: 'Boom',
});

const badRoute = defineRoute({
  id: 'probe.bad',
  method: 'GET',
  path: '/v1/probe/bad',
  auth: 'public',
  action: null,
  response: z.object({ count: z.number() }),
  summary: 'Bad response',
});

const itemRoute = defineRoute({
  id: 'probe.item',
  method: 'GET',
  path: '/v1/probe/items/:itemId',
  auth: 'public',
  action: null,
  params: z.object({ itemId: z.string() }),
  response: z.object({ item: z.string() }),
  summary: 'Item',
});

const specialRoute = defineRoute({
  id: 'probe.special',
  method: 'GET',
  path: '/v1/probe/items/special',
  auth: 'public',
  action: null,
  response: z.object({ item: z.string() }),
  summary: 'Special item',
});

const sessionRoute = defineRoute({
  id: 'probe.session',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/session-probe',
  auth: 'session',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({}),
  summary: 'Session only',
});

const grantRoute = defineRoute({
  id: 'probe.grant',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/probe',
  auth: 'grant',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({}),
  summary: 'Grant only',
});

const privateUploadRoute = defineRoute({
  id: 'probe.private_upload',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/upload',
  auth: 'grant',
  action: 'media:write',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({ data: z.string() }),
  response: z.object({ size: z.number() }),
  summary: 'Grant upload',
});

const probes: BoundRoute[] = [
  bindRoute(echoRoute, async ({ body }) => {
    const leaky = { text: body.text, CANARY_leak: 'CANARY_value' };
    return { body: leaky };
  }),
  bindRoute(uploadRoute, async ({ body }) => ({ body: { size: body.data.length } })),
  bindRoute(boomRoute, async () => {
    throw new Error('CANARY_internal detail');
  }),
  bindRoute(badRoute, async () => {
    const wrong = { count: 'many' } as unknown as { count: number };
    return { body: wrong };
  }),
  bindRoute(itemRoute, async ({ params }) => ({ body: { item: params.itemId } })),
  bindRoute(specialRoute, async () => ({ body: { item: 'literal' } })),
  bindRoute(sessionRoute, async () => ({ body: {} })),
  bindRoute(grantRoute, async () => ({ body: {} })),
  bindRoute(privateUploadRoute, async ({ body }) => ({ body: { size: body.data.length } })),
];

function setup(overrides: Partial<HttpDeps> = {}) {
  const lines: string[] = [];
  const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });
  const deps: HttpDeps = {
    db: unusedDb,
    keys: deriveHttpKeys(randomBytes(32)),
    logger,
    clock: () => NOW,
    publicBaseUrl: BASE,
    readiness: async () => true,
    maxBodyBytes: 1024,
    routeBodyLimits: { 'probe.upload': 4096, 'probe.private_upload': 4096 },
    ...overrides,
  };
  const app = createHttpApp(deps, [...systemRoutes(deps), ...probes]);
  return { app, lines };
}

function expectSecurityHeaders(response: Response, hsts = true): void {
  expect(response.headers.get('content-security-policy')).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('strict-transport-security')).toBe(hsts ? 'max-age=31536000' : null);
  expect(response.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9-]{8,64}$/);
}

function json(text: string): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: text };
}

describe('system routes', () => {
  it('answers healthz and readyz', async () => {
    const { app } = setup();
    const health = await app.request('/healthz');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });
    expectSecurityHeaders(health);
    const ready = await app.request('/readyz');
    expect(await ready.json()).toEqual({ status: 'ready' });
  });

  it('answers 503 when not ready or when the check throws', async () => {
    for (const readiness of [async () => false, () => Promise.reject(new Error('down'))]) {
      const { app } = setup({ readiness });
      const response = await app.request('/readyz');
      expect(response.status).toBe(503);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe('unavailable');
    }
  });
});

describe('errors and headers', () => {
  it('returns a 404 envelope with security headers', async () => {
    const { app } = setup();
    const response = await app.request('/v1/nope', { headers: { 'x-request-id': 'req-12345678' } });
    expect(response.status).toBe(404);
    expectSecurityHeaders(response);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'Not found.', requestId: 'req-12345678' },
    });
  });

  it('returns 405 with Allow for a known path and wrong method', async () => {
    const { app } = setup();
    const response = await app.request('/healthz', { method: 'DELETE' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    const body = (await response.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.requestId).toBe(response.headers.get('x-request-id'));
  });

  it('hides unknown exceptions behind a generic 500 and logs them', async () => {
    const { app, lines } = setup();
    const response = await app.request('/v1/probe/boom');
    expect(response.status).toBe(500);
    expectSecurityHeaders(response);
    const text = await response.text();
    expect(text).not.toContain('CANARY_');
    const body = JSON.parse(text) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('internal');
    const requestId = response.headers.get('x-request-id');
    expect(body.error.requestId).toBe(requestId);
    expect(
      lines.some((line) => line.includes('CANARY_internal') && line.includes(requestId ?? '?')),
    ).toBe(true);
  });

  it('omits HSTS for a plain http base url', async () => {
    const { app } = setup({ publicBaseUrl: 'http://localhost:3000' });
    expectSecurityHeaders(await app.request('/healthz'), false);
  });

  it('maps reauth_required and otp_required to distinct 403 errors', () => {
    const reauth = denyError('reauth_required');
    const otp = denyError('otp_required');
    expect(reauth.status).toBe(403);
    expect(otp.status).toBe(403);
    expect(reauth.message).not.toBe(otp.message);
  });
});

describe('request id', () => {
  it('echoes a valid inbound id', async () => {
    const { app } = setup();
    const response = await app.request('/healthz', {
      headers: { 'x-request-id': 'abcDEF12-3456' },
    });
    expect(response.headers.get('x-request-id')).toBe('abcDEF12-3456');
  });

  it('replaces an invalid inbound id', async () => {
    const { app } = setup();
    for (const bad of ['short', 'has space in it', 'x'.repeat(65), 'semi;colon1234']) {
      const response = await app.request('/healthz', { headers: { 'x-request-id': bad } });
      const id = response.headers.get('x-request-id');
      expect(id).not.toBe(bad);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe('body limits', () => {
  it('rejects a body over the default limit with 413', async () => {
    const { app } = setup();
    const response = await app.request(
      '/v1/probe/echo',
      json(JSON.stringify({ text: 'a'.repeat(2000) })),
    );
    expect(response.status).toBe(413);
    expectSecurityHeaders(response);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('payload_too_large');
  });

  it('rejects by declared Content-Length before reading', async () => {
    const { app } = setup();
    const response = await app.request('/v1/probe/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '999999' },
      body: '{"text":"a"}',
    });
    expect(response.status).toBe(413);
  });

  it('applies a per-route override', async () => {
    const { app } = setup();
    const fits = await app.request(
      '/v1/probe/upload',
      json(JSON.stringify({ data: 'a'.repeat(2000) })),
    );
    expect(fits.status).toBe(200);
    expect(await fits.json()).toEqual({ size: 2000 });
    const tooBig = await app.request(
      '/v1/probe/upload',
      json(JSON.stringify({ data: 'a'.repeat(5000) })),
    );
    expect(tooBig.status).toBe(413);
  });

  it('authenticates before buffering a raised limit', async () => {
    const { app } = setup();
    const response = await app.request(
      '/v1/workspaces/ws_x/upload',
      json(JSON.stringify({ data: 'a'.repeat(5000) })),
    );
    expect(response.status).toBe(401);
  });

  it('answers 413 before 404 for an oversized body on an unknown path', async () => {
    const { app } = setup();
    const response = await app.request('/v1/nowhere', json('a'.repeat(2000)));
    expect(response.status).toBe(413);
  });
});

describe('input and output parsing', () => {
  it('returns 400 with paths and codes only', async () => {
    const { app } = setup();
    const response = await app.request('/v1/probe/echo', json(JSON.stringify({ text: 12345 })));
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain('12345');
    const body = JSON.parse(text) as { error: { code: string; details: unknown } };
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.details).toEqual([{ path: 'body.text', code: 'invalid_type' }]);
  });

  it('rejects malformed JSON with 400 and a wrong content type with 415', async () => {
    const { app } = setup();
    expect((await app.request('/v1/probe/echo', json('{"text":'))).status).toBe(400);
    const wrongType = await app.request('/v1/probe/echo', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{"text":"a"}',
    });
    expect(wrongType.status).toBe(415);
  });

  it('strips unknown response keys', async () => {
    const { app } = setup();
    const response = await app.request('/v1/probe/echo', json(JSON.stringify({ text: 'hi' })));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('CANARY_');
    expect(JSON.parse(text)).toEqual({ text: 'hi' });
  });

  it('turns an invalid response into a 500 and a log entry', async () => {
    const { app, lines } = setup();
    const response = await app.request('/v1/probe/bad');
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('many');
    expect(lines.some((line) => line.includes('response failed validation'))).toBe(true);
  });

  it('prefers literal segments and decodes params', async () => {
    const { app } = setup();
    expect(await (await app.request('/v1/probe/items/special')).json()).toEqual({
      item: 'literal',
    });
    expect(await (await app.request('/v1/probe/items/a%20b')).json()).toEqual({ item: 'a b' });
    expect((await app.request('/v1/probe/items/%E0%A4%A')).status).toBe(404);
    expect((await app.request('/v1/probe/items/')).status).toBe(404);
  });
});

describe('authentication without a database', () => {
  it('answers 401 without credentials', async () => {
    const { app } = setup();
    const response = await app.request('/v1/workspaces/ws_x/session-probe');
    expect(response.status).toBe(401);
    expectSecurityHeaders(response);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('unauthenticated');
  });

  it('answers 401 for malformed credentials', async () => {
    const { app } = setup();
    const cookie = await app.request('/v1/workspaces/ws_x/session-probe', {
      headers: { cookie: '__Host-kronaut_session=garbage' },
    });
    expect(cookie.status).toBe(401);
    const bearer = await app.request('/v1/workspaces/ws_x/probe', {
      headers: { authorization: 'Bearer not-a-token' },
    });
    expect(bearer.status).toBe(401);
  });
});

describe('Cloudflare Access gate', () => {
  const GOOD = 'header.payload.good';
  const access: AccessGate = {
    verify: async (token) => {
      if (token === GOOD) return { ok: true };
      return { ok: false, reason: token === null ? 'missing' : 'signature' };
    },
  };

  it('answers one generic 403 before routing or reading the body', async () => {
    const { app, lines } = setup({ access });
    const bad = 'header.payload.forged';
    const responses = [
      await app.request('/v1/probe/items/x'),
      await app.request('/v1/probe/items/x', { headers: { 'cf-access-jwt-assertion': bad } }),
      await app.request('/v1/nope'),
      await app.request('/healthz', { method: 'DELETE' }),
      await app.request('/v1/probe/echo', json(JSON.stringify({ text: 'x'.repeat(2048) }))),
    ];
    for (const response of responses) {
      expect(response.status).toBe(403);
      expectSecurityHeaders(response);
      expect(await response.json()).toEqual({
        error: {
          code: 'forbidden',
          message: 'Access denied.',
          requestId: response.headers.get('x-request-id'),
        },
      });
    }
    expect(lines.some((line) => line.includes('"reason":"signature"'))).toBe(true);
    expect(lines.some((line) => line.includes(bad))).toBe(false);
  });

  it('runs the route for a valid assertion', async () => {
    const { app } = setup({ access });
    const response = await app.request('/v1/probe/items/x', {
      headers: { 'cf-access-jwt-assertion': GOOD },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ item: 'x' });
  });

  it('exempts the GET probes', async () => {
    const { app } = setup({ access });
    expect((await app.request('/healthz')).status).toBe(200);
    expect((await app.request('/readyz')).status).toBe(200);
  });

  it('exempts GET public provider documents and nothing else', () => {
    expect(accessExempt('GET', '/oauth/bluesky/client-metadata.json')).toBe(true);
    expect(accessExempt('GET', '/oauth/fake/jwks.json')).toBe(true);
    for (const [method, path] of [
      ['POST', '/oauth/fake/client-metadata.json'],
      ['HEAD', '/oauth/fake/client-metadata.json'],
      ['GET', '/oauth/fake/x/y'],
      ['GET', '/oauth/fake/x%2F..%2Fy'],
      ['GET', '/oauth/fake/'],
      ['GET', '/oauth/Fake/doc.json'],
      ['GET', `/oauth/fake/${'a'.repeat(65)}`],
      ['GET', '/v1/oauth/fake/callback'],
      ['GET', '/oauth/fake/doc.json/'],
      ['GET', '/x/oauth/fake/doc.json'],
    ] as const) {
      expect(accessExempt(method, path), `${method} ${path}`).toBe(false);
    }
  });
});

describe('router', () => {
  it('reports allowed methods', () => {
    const match = createRouter(probes)('PUT', '/v1/probe/echo');
    expect(match).toEqual({ kind: 'method_not_allowed', allow: ['POST'] });
  });
});
