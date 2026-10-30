import { randomBytes, randomUUID } from 'node:crypto';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import type { Database, TenantDb } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import { createLocalStore, type MediaStore } from '@kronaut/media';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { type Logger, pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { expect } from 'vitest';
import { hashGrantToken } from '../auth/grant.ts';
import { SESSION_COOKIE } from '../auth/session.ts';
import type { CronTask } from '../cron.ts';
import { createMediaSigner, type MediaSigner } from '../media/access.ts';
import { createStaging, type Staging } from '../media/staging.ts';
import { hashPassword } from '../password.ts';
import { createProviderRegistry, type ProviderRegistry } from '../providers.ts';
import type { AccessGate } from './access.ts';
import { API_BODY_LIMITS, apiRoutes } from './api-routes.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps, type HttpKeys } from './kernel.ts';
import type { BoundRoute } from './types.ts';

export const BASE = 'https://kronaut.example.test';
export const PASSWORD = 'correct horse battery';

const NOWHERE = '/nonexistent';

export type Auth = { readonly cookie: string } | { readonly bearer: string };

export interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: { path: string; code: string }[];
  };
}

export interface TestInstanceOptions {
  readonly db: Database;
  readonly keys?: HttpKeys;
  readonly keyring?: Keyring;
  readonly providers?: ProviderRegistry;
  readonly store?: MediaStore;
  readonly signer?: MediaSigner;
  readonly staging?: Staging;
  readonly logger?: Logger;
  readonly clock?: () => Temporal.Instant;
  readonly cronTasks?: readonly CronTask[];
  readonly instanceAdmins?: readonly string[];
  readonly access?: AccessGate;
}

export interface TestInstance {
  readonly app: Hono;
  readonly deps: HttpDeps;
  readonly routes: readonly BoundRoute[];
}

export function createTestInstance({
  db,
  keys = deriveHttpKeys(randomBytes(32)),
  keyring = createKeyring(new Map([[1, randomBytes(32)]])),
  providers = createProviderRegistry([], [], () => ({}) as HttpClient),
  store = createLocalStore(NOWHERE),
  logger = pino({ level: 'silent' }),
  clock = () => Temporal.Now.instant(),
  signer = createMediaSigner({
    signingKey: randomBytes(32),
    mediaBaseUrl: new URL('https://media.example.test'),
    clock,
  }),
  staging = createStaging(NOWHERE),
  cronTasks = [],
  instanceAdmins = [],
  access,
}: TestInstanceOptions): TestInstance {
  const deps: HttpDeps = {
    db,
    keys,
    logger,
    clock,
    publicBaseUrl: BASE,
    instanceAdmins,
    readiness: async () => true,
    routeBodyLimits: API_BODY_LIMITS,
    ...(access === undefined ? {} : { access }),
  };
  const routes = apiRoutes({ http: deps, store, signer, staging, keyring, providers, cronTasks });
  return { app: createHttpApp(deps, routes), deps, routes };
}

export async function createTestUser(db: Database, label: string): Promise<string> {
  const hash = await hashPassword(PASSWORD);
  return await db.withActor({ kind: 'system' }, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                              ${label}, ${hash}, 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
}

export async function loginAs(app: Hono, label: string): Promise<{ readonly cookie: string }> {
  const response = await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${label}@example.test`, password: PASSWORD }),
  });
  const header = response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return { cookie: header?.split(';')[0] ?? '' };
}

export interface TestRequest {
  readonly method: 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE';
  readonly url: string;
  readonly body?: unknown;
  readonly key?: string | undefined;
}

export async function requestAs(
  app: Hono,
  auth: Auth,
  { method, url, body, key = randomUUID() }: TestRequest,
): Promise<Response> {
  const headers: Record<string, string> =
    'cookie' in auth
      ? { cookie: auth.cookie, origin: BASE }
      : { authorization: `Bearer ${auth.bearer}` };
  if (method !== 'GET') headers['idempotency-key'] = key;
  if (body === undefined) return await app.request(url, { method, headers });
  if (body instanceof Uint8Array) {
    headers['content-type'] = 'application/octet-stream';
    return await app.request(url, { method, headers, body: body as Uint8Array<ArrayBuffer> });
  }
  headers['content-type'] = 'application/json';
  return await app.request(url, { method, headers, body: JSON.stringify(body) });
}

export async function errorOf(response: Response): Promise<ErrorResponse['error']> {
  return ((await response.json()) as ErrorResponse).error;
}

export async function expectError(
  response: Response,
  status: number,
  code: string,
): Promise<ErrorResponse['error']> {
  expect(response.status).toBe(status);
  const error = await errorOf(response);
  expect(error.code).toBe(code);
  return error;
}

export interface TestGrant {
  readonly workspaceId: string;
  readonly sponsorUserId: string;
  readonly scopes: readonly string[];
  readonly restricted?: boolean;
}

export function randomGrantToken(): string {
  return `kro_${randomBytes(8).toString('hex')}_${randomBytes(24).toString('base64url')}`;
}

export async function insertTestGrant(
  trx: TenantDb,
  key: Uint8Array,
  token: string,
  grant: TestGrant,
): Promise<string> {
  const { id } = await trx
    .insertInto('access_grants')
    .values({
      workspace_id: grant.workspaceId,
      kind: 'api_key',
      name: 'Agent',
      sponsor_user_id: grant.sponsorUserId,
      scopes: [...grant.scopes],
      resource_scope: grant.restricted === true ? 'restricted' : 'workspace',
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('grant_tokens')
    .values({
      workspace_id: grant.workspaceId,
      grant_id: id,
      kind: 'key',
      key_id: token.split('_')[1] ?? '',
      token_hash: hashGrantToken(key, token),
      hash_key_version: 1,
    })
    .execute();
  return id;
}
