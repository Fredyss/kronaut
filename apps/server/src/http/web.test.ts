import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database } from '@kronaut/db';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, describe, expect, it } from 'vitest';
import { authRoutes } from '../auth/routes.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps } from './kernel.ts';
import { systemRoutes } from './system-routes.ts';
import { loadWebApp, webCsp } from './web.ts';

const root = mkdtempSync(join(tmpdir(), 'kronaut-web-'));
mkdirSync(join(root, 'assets'));
writeFileSync(join(root, 'index.html'), '<!doctype html><title>Kronaut</title>');
writeFileSync(join(root, 'assets', 'index-abc123.js'), 'export {};');

afterAll(() => rmSync(root, { recursive: true, force: true }));

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const MEDIA = new URL('https://media.example.test');

function app(web: boolean) {
  const deps: HttpDeps = {
    db: unusedDb,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => Temporal.Now.instant(),
    publicBaseUrl: 'https://kronaut.example.test',
    readiness: async () => true,
    ...(web ? { web: loadWebApp(root, MEDIA) } : {}),
  };
  return createHttpApp(deps, [...systemRoutes(deps), ...authRoutes(deps)]);
}

const HTML = { accept: 'text/html,application/xhtml+xml' };

describe('web app serving', () => {
  it('serves the SPA beside the API without shadowing it', async () => {
    const served = app(true);

    const asset = await served.request('/assets/index-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8');

    const deep = await served.request('/settings', { headers: HTML });
    expect(deep.status).toBe(200);
    expect(await deep.text()).toContain('<title>Kronaut</title>');
    expect(deep.headers.get('content-security-policy')).toBe(webCsp(MEDIA));
    expect(deep.headers.get('content-security-policy')).toContain(
      "img-src 'self' https://media.example.test data:",
    );
    expect(deep.headers.get('content-security-policy')).toContain('media-src blob:');
    expect(deep.headers.get('cache-control')).toBe('no-cache');
    expect(deep.headers.get('x-content-type-options')).toBe('nosniff');
    expect(deep.headers.get('referrer-policy')).toBe('same-origin');

    const unknown = await served.request('/v1/unknown', { headers: HTML });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: { code: 'not_found' } });
    expect((await served.request('/v1/me', { headers: HTML })).status).toBe(401);
    expect((await served.request('/settings')).status).toBe(404);

    const before = await app(false).request('/', { headers: HTML });
    expect(before.status).toBe(404);
    expect(before.headers.get('content-security-policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
  });
});
