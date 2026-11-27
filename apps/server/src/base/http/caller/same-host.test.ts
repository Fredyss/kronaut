import { randomBytes } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import type { Database } from '@kronaut/db';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { authenticate } from '../../../identity/auth/authenticate.ts';
import { guardSession } from '../../../identity/auth/session-guard.ts';
import { createHttpApp, deriveHttpKeys } from '../pipeline/kernel.ts';
import { bindRoute } from '../request.ts';

const BASE = 'https://kronaut.example.test';
const PATH = '/v1/workspaces/ws_probe/same-host';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const probe = defineRoute({
  id: 'probe.same_host',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/same-host',
  auth: 'grant',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({}),
  idempotency: false,
  summary: 'Same-host probe',
});

const app = createHttpApp(
  {
    db: unusedDb,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => Temporal.Now.instant(),
    publicBaseUrl: BASE,
    readiness: async () => true,
    authenticate,
    guardSession,
  },
  [bindRoute(probe, async () => ({ body: {} }), { sameHost: true })],
);

async function status(url: string, headers: Record<string, string> = {}): Promise<number> {
  return (await app.request(url, { method: 'POST', headers })).status;
}

describe('same-host routes', () => {
  it('refuses another Host or Origin with 403 before authentication', async () => {
    expect(await status(`http://evil.example.test${PATH}`)).toBe(403);
    expect(await status(`${BASE}${PATH}`, { host: 'evil.example.test' })).toBe(403);
    expect(await status(`${BASE}${PATH}`, { origin: 'https://evil.example.test' })).toBe(403);
    expect(await status(`${BASE}${PATH}`, { origin: 'null' })).toBe(403);
  });

  it('lets the public host through to authentication', async () => {
    expect(await status(`${BASE}${PATH}`)).toBe(401);
    expect(await status(`${BASE}${PATH}`, { host: 'KRONAUT.example.test', origin: BASE })).toBe(
      401,
    );
  });
});
