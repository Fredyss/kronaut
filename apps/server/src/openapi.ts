import { randomBytes } from 'node:crypto';
import { createKeyring } from '@kronaut/credentials';
import type { Database } from '@kronaut/db';
import { createLocalStore } from '@kronaut/media';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { apiRoutes } from './http/api-routes.ts';
import { deriveHttpKeys, type HttpDeps, routeRegistry } from './http/kernel.ts';
import { createStaging } from './media/staging.ts';
import { createProviderRegistry } from './providers.ts';

export const OPENAPI_PATH = new URL('../../../packages/contract/openapi.json', import.meta.url);

const inert = (): Promise<never> => Promise.reject(new Error('route enumeration has no database'));

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries.map(([key, inner]) => [key, sortKeys(inner)]));
}

export function renderOpenApi(): string {
  const db: Database = {
    withTenant: inert,
    withActor: inert,
    sweeps: {} as Database['sweeps'],
    destroy: () => Promise.resolve(),
  };
  const http: HttpDeps = {
    db,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => Temporal.Now.instant(),
    publicBaseUrl: 'http://localhost/',
    readiness: async () => false,
  };
  const routes = apiRoutes({
    http,
    store: createLocalStore('/nonexistent'),
    staging: createStaging('/nonexistent'),
    keyring: createKeyring(new Map([[1, randomBytes(32)]])),
    providers: createProviderRegistry([], []),
  });
  const document = routeRegistry(routes).openapi({ title: 'Kronaut API', version: '0' });
  return `${JSON.stringify(sortKeys(document), null, 2)}\n`;
}
