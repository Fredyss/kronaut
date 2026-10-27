import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineRoute } from '@kronaut/contract';
import { createKeyring } from '@kronaut/credentials';
import type { Database } from '@kronaut/db';
import { createLocalStore } from '@kronaut/media';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { createStaging } from '../media/staging.ts';
import { createProviderRegistry } from '../providers.ts';
import { apiRoutes } from './api-routes.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps, routeRegistry } from './kernel.ts';
import { type BoundRoute, bindRoute } from './types.ts';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const deps: HttpDeps = {
  db: unusedDb,
  keys: deriveHttpKeys(randomBytes(32)),
  logger: pino({ level: 'silent' }),
  clock: () => Temporal.Now.instant(),
  publicBaseUrl: 'https://kronaut.example.test',
  readiness: async () => true,
};

const workspaceProbe = defineRoute({
  id: 'probe.workspace_write',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/probe',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({ title: z.string() }),
  response: z.object({}),
  summary: 'Workspace probe',
});

const grantProbe = defineRoute({
  id: 'probe.grant_read',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/grant-probe',
  auth: 'grant',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({}),
  summary: 'Grant probe',
});

const routes: BoundRoute[] = [
  ...apiRoutes({
    http: deps,
    store: createLocalStore('/nonexistent'),
    staging: createStaging('/nonexistent'),
    keyring: createKeyring(new Map([[1, randomBytes(32)]])),
    providers: createProviderRegistry([], []),
  }),
  bindRoute(workspaceProbe, async () => ({ body: {} })),
  bindRoute(grantProbe, async () => ({ body: {} })),
];

const snapshot = JSON.parse(
  readFileSync(new URL('./public-routes.json', import.meta.url), 'utf8'),
) as string[];

describe('public route snapshot', () => {
  it('matches the registry exactly', () => {
    expect([...routeRegistry(routes).publicRoutes()]).toEqual(snapshot);
  });

  it('answers 401 without credentials on every other route', async () => {
    const app = createHttpApp(deps, routes);
    const guarded = routeRegistry(routes)
      .all()
      .filter((route) => !snapshot.includes(`${route.method} ${route.path}`));
    expect(guarded.length).toBeGreaterThanOrEqual(4);
    for (const route of guarded) {
      const path = route.path.replaceAll(/:[A-Za-z]+/g, 'ws_probe');
      const init: RequestInit =
        route.method === 'GET'
          ? { method: route.method }
          : {
              method: route.method,
              headers: { 'content-type': 'application/json' },
              body: '{}',
            };
      const response = await app.request(path, init);
      expect(response.status, `${route.method} ${route.path}`).toBe(401);
    }
  });
});
