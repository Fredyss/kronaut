import { randomBytes } from 'node:crypto';
import {
  decodePublicId,
  encodePublicId,
  type ProviderManifest,
  type ProviderRuntime,
} from '@kronaut/core';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database, type TenantDb } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { pino } from 'pino';
import { expect } from 'vitest';
import { hashGrantToken } from '../auth/grant.ts';
import { activateKey, createKey } from '../cli/provider-apps.ts';
import { loadCredential } from '../credential-store.ts';
import type { AccessGate } from '../http/access.ts';
import { BASE, createTestInstance, createTestUser, loginAs } from '../http/testing.ts';
import { installJobQueue } from '../jobs/job-queue.ts';
import { createProviderRegistry } from '../providers.ts';
import { FAKE_PROVIDER, type FixtureUrls, fakeManifest } from '../publish/testing.ts';

export { BASE } from '../http/testing.ts';

export const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };
export const GRANT_TOKEN = `kro_${'c'.repeat(16)}_${'d'.repeat(32)}`;
export const CANARY = 'CANARY_pkce_verifier';
export const CODE = 'CODE_one_time_authorization';
export const CREDENTIALS = { accessToken: 'CANARY_access', refreshToken: 'CANARY_refresh' };
const GOOD_ASSERTION = 'header.payload.good';

export let db: Database;
let operator: Database;
export let keyring: Keyring;
export let app: Hono;
export let gated: Hono;
export let workspaceId: string;
let ownerId: string;
export let owner: string;
export let admin: string;
export let editor: string;
export let viewer: string;
export const lines: string[] = [];

function createUser(label: string): Promise<string> {
  return createTestUser(db, label);
}

async function login(label: string): Promise<string> {
  return (await loginAs(app, label)).cookie;
}

export async function start(
  headers: Record<string, string>,
  loginHint?: string,
  provider = FAKE_PROVIDER,
): Promise<Response> {
  return app.request(
    `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/channels/connect`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, ...headers },
      body: JSON.stringify({ provider, loginHint }),
    },
  );
}

export async function begin(
  cookie: string = owner,
  loginHint?: string,
  provider = FAKE_PROVIDER,
): Promise<string> {
  const response = await start({ cookie }, loginHint, provider);
  expect(response.status).toBe(200);
  const { authorizationUrl } = (await response.json()) as { authorizationUrl: string };
  return new URL(authorizationUrl).searchParams.get('state') ?? '';
}

export async function callback(
  state: string,
  cookie: string = owner,
  provider = FAKE_PROVIDER,
): Promise<URL> {
  const query = new URLSearchParams({ state, code: CODE });
  const response = await app.request(`${BASE}/v1/oauth/${provider}/callback?${query}`, {
    headers: { cookie },
  });
  expect(response.status).toBe(303);
  return new URL(response.headers.get('location') ?? '');
}

export function connectedId(location: URL): string {
  expect(`${location.origin}${location.pathname}`).toBe(`${BASE}/channels`);
  return decodePublicId('socialAccount', location.searchParams.get('connected') ?? '') ?? '';
}

export function asOwner<T>(fn: (trx: TenantDb) => Promise<T>): Promise<T> {
  return db.withTenant(workspaceId, { kind: 'user', id: ownerId }, fn);
}

export async function snapshot(providerAccountId: string) {
  return await asOwner(async (trx) => {
    const account = await trx
      .selectFrom('social_accounts')
      .select(['id', 'status'])
      .where('provider_account_id', '=', providerAccountId)
      .executeTakeFirst();
    if (account === undefined) {
      return { status: undefined as string | undefined, version: null as number | null, audits: 0 };
    }
    const credential = await loadCredential(trx, keyring, {
      workspaceId,
      socialAccountId: account.id,
      kind: 'oauth',
    });
    const { audits } = await trx
      .selectFrom('audit_events')
      .select(sql<number>`count(*)::integer`.as('audits'))
      .where('resource_id', '=', account.id)
      .executeTakeFirstOrThrow();
    return { status: account.status, version: credential?.version ?? null, audits };
  });
}

export interface ExtraProvider {
  readonly manifest: ProviderManifest;
  readonly runtime: ProviderRuntime;
}

export async function startConnect(
  test: FixtureUrls,
  runtime: ProviderRuntime,
  extra: readonly ExtraProvider[] = [],
): Promise<void> {
  db = createDatabase({ connectionString: test.appUrl });
  const root = createDatabase({ connectionString: test.ownerUrl });
  operator = createDatabase({ connectionString: test.operatorUrl });
  keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });
  const providers = createProviderRegistry(
    [fakeManifest, ...extra.map((entry) => entry.manifest)],
    [runtime, ...extra.map((entry) => entry.runtime)],
    () => ({}) as HttpClient,
  );
  const options = { db, keyring, providers, logger };
  const instance = createTestInstance(options);
  app = instance.app;
  const { keys } = instance.deps;
  const access: AccessGate = {
    verify: async (token) =>
      token === GOOD_ASSERTION ? { ok: true } : { ok: false, reason: 'missing' },
  };
  gated = createTestInstance({ ...options, keys, access }).app;

  ownerId = await createUser('owner');
  const adminId = await createUser('admin');
  const editorId = await createUser('editor');
  const viewerId = await createUser('viewer');
  workspaceId = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', 'ws-connect', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  await operator.withActor(CLI, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({ provider: FAKE_PROVIDER, client_id: 'fake-client' })
      .execute(),
  );
  await installJobQueue(test.ownerUrl, root);
  await root.withActor(CLI, async (trx) => {
    await trx
      .insertInto('memberships')
      .values([
        { workspace_id: workspaceId, user_id: adminId, role: 'admin' },
        { workspace_id: workspaceId, user_id: editorId, role: 'editor' },
        { workspace_id: workspaceId, user_id: viewerId, role: 'viewer' },
      ])
      .execute();
    const { id: grantId } = await trx
      .insertInto('access_grants')
      .values({
        workspace_id: workspaceId,
        kind: 'api_key',
        name: 'Agent',
        sponsor_user_id: ownerId,
        scopes: ['channels:read'],
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('grant_tokens')
      .values({
        workspace_id: workspaceId,
        grant_id: grantId,
        kind: 'key',
        key_id: 'c'.repeat(16),
        token_hash: hashGrantToken(keys.grant, GRANT_TOKEN),
        hash_key_version: 1,
      })
      .execute();
  });
  await root.destroy();
  owner = await login('owner');
  admin = await login('admin');
  editor = await login('editor');
  viewer = await login('viewer');
}

export async function stopConnect(): Promise<void> {
  await operator?.destroy();
  await db?.destroy();
}

export async function registerApp(provider: string): Promise<void> {
  await operator.withActor(CLI, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({ provider, client_id: `${provider}-client` })
      .execute(),
  );
}

export function fakeAppId(): Promise<string> {
  return db.withActor(SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('provider_apps')
      .select('id')
      .where('provider', '=', FAKE_PROVIDER)
      .executeTakeFirstOrThrow();
    return row.id;
  });
}

export function keyDeps() {
  return { db: operator, keyring, logger: pino({ level: 'silent' }) };
}

export async function rotate(): Promise<string> {
  const appId = await fakeAppId();
  const kid = await createKey(keyDeps(), appId);
  await activateKey(keyDeps(), appId, kid);
  return await db.withActor(SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('provider_app_keys')
      .select('id')
      .where('provider_app_id', '=', appId)
      .where('kid', '=', kid)
      .executeTakeFirstOrThrow();
    return row.id;
  });
}

export async function boundKey(accountId: string): Promise<string | null> {
  return await asOwner(async (trx) => {
    const row = await trx
      .selectFrom('account_credentials')
      .select('client_key_id')
      .where('social_account_id', '=', accountId)
      .executeTakeFirstOrThrow();
    return row.client_key_id;
  });
}
