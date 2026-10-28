import { randomBytes } from 'node:crypto';
import { encodePublicId, type ProviderRuntime } from '@kronaut/core';
import { createKeyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashGrantToken } from '../auth/grant.ts';
import { authRoutes } from '../auth/routes.ts';
import { SESSION_COOKIE } from '../auth/session.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps } from '../http/kernel.ts';
import { hashPassword } from '../password.ts';
import { createProviderRegistry } from '../providers.ts';
import { FAKE_PROVIDER, fakeManifest } from '../publish/testing.ts';
import { channelRoutes } from './routes.ts';

const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };
const BASE = 'https://kronaut.example.test';
const PASSWORD = 'correct horse battery';
const GRANT_TOKEN = `kro_${'e'.repeat(16)}_${'f'.repeat(32)}`;
const DISABLED = 'fake_off';
const MISSING = 'fake_none';
const KEY_PENDING = 'fake_key_pending';

let test: TestDatabase;
let db: Database;
let app: Hono;
let workspace: string;
let owner: string;
let viewer: string;
let ownAccountId: string;
let rulesWorkspace: string;
let previewWorkspace: string;

function runtime(id: string): ProviderRuntime {
  return {
    id,
    parseCredentials: (value) => value,
    connectStart: () => Promise.reject(new Error('not used')),
    connectFinish: () => Promise.reject(new Error('not used')),
    publish: () => Promise.reject(new Error('not used')),
  };
}

async function createUser(label: string): Promise<string> {
  const hash = await hashPassword(PASSWORD);
  return await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                              ${label}, ${hash}, 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
}

async function provision(userId: string, slug: string): Promise<string> {
  return await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', ${slug}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
}

interface AccountOptions {
  readonly provider?: string;
  readonly capabilities?: unknown;
}

async function addAccount(
  workspaceId: string,
  userId: string,
  remote: string,
  { provider = FAKE_PROVIDER, capabilities = { secret: 'CANARY_capability' } }: AccountOptions = {},
): Promise<string> {
  return await db.withTenant(workspaceId, { kind: 'user', id: userId }, async (trx) => {
    const row = await trx
      .insertInto('social_accounts')
      .values({
        workspace_id: workspaceId,
        provider,
        provider_app_id: sql<string>`(select id from provider_apps where provider = ${provider})`,
        provider_account_id: remote,
        account_kind: 'profile',
        handle: `${remote}.example`,
        display_name: remote,
        profile_url: `https://fake.example.test/${remote}`,
        status: 'needs_reauth',
        status_reason: 'auth_revoked',
        last_error_code: 'auth_revoked',
        capabilities: JSON.stringify(capabilities),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
}

async function login(label: string): Promise<string> {
  const response = await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${label}@example.test`, password: PASSWORD }),
  });
  const header = response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return header?.split(';')[0] ?? '';
}

async function get(path: string, headers: Record<string, string>): Promise<Response> {
  return await app.request(`${BASE}/v1/workspaces/${workspace}/channels${path}`, { headers });
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  const root = createDatabase({ connectionString: test.ownerUrl });
  const operator = createDatabase({ connectionString: test.operatorUrl });
  const deps: HttpDeps = {
    db,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => Temporal.Now.instant(),
    publicBaseUrl: BASE,
    readiness: async () => true,
  };
  const ids = [FAKE_PROVIDER, DISABLED, MISSING, KEY_PENDING];
  const providers = createProviderRegistry(
    [...ids.map((id) => ({ ...fakeManifest, id })), ...manifests],
    [...ids.map(runtime), ...runtimes],
    () => ({}) as HttpClient,
  );
  const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  app = createHttpApp(deps, [
    ...authRoutes(deps),
    ...channelRoutes({
      db,
      keys: deps.keys,
      keyring,
      providers,
      publicBaseUrl: BASE,
      clock: deps.clock,
    }),
  ]);

  const ownerId = await createUser('owner');
  const viewerId = await createUser('viewer');
  const strangerId = await createUser('stranger');
  const workspaceId = await provision(ownerId, 'ws-list');
  const otherId = await provision(strangerId, 'ws-other');
  workspace = encodePublicId('workspace', workspaceId);
  await operator.withActor(CLI, async (trx) => {
    await trx
      .insertInto('provider_apps')
      .values([
        { provider: FAKE_PROVIDER, client_id: 'fake-client' },
        { provider: 'bluesky', client_id: 'https://kronaut.example.test/client-metadata.json' },
        { provider: DISABLED, client_id: 'off-client', status: 'disabled' },
        { provider: 'instagram', client_id: 'ig-client', status: 'disabled' },
        { provider: 'threads', client_id: '1122334455667788' },
        { provider: 'mastodon', instance_host: 'social.example', client_id: 'masto-client' },
      ])
      .execute();
    const { id: pendingApp } = await trx
      .insertInto('provider_apps')
      .values({ provider: KEY_PENDING, client_id: 'pending-client' })
      .returning('id')
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('provider_app_keys')
      .values({
        provider_app_id: pendingApp,
        kid: 'pending-key-1',
        alg: 'ES256',
        public_jwk: JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y' }),
        ciphertext: Buffer.alloc(1),
        nonce: Buffer.alloc(12),
        wrapped_dek: Buffer.alloc(1),
        kek_version: 1,
      })
      .execute();
  });
  await operator.destroy();
  ownAccountId = await addAccount(workspaceId, ownerId, 'mine');
  await addAccount(otherId, strangerId, 'theirs');
  const rulesId = await provision(ownerId, 'ws-rules');
  rulesWorkspace = encodePublicId('workspace', rulesId);
  await addAccount(rulesId, ownerId, 'masto', {
    provider: 'mastodon',
    capabilities: {
      instance: { maxCharacters: 1000, charactersReservedPerUrl: 30 },
      secret: 'CANARY_capability',
    },
  });
  await addAccount(rulesId, ownerId, 'thr', { provider: 'threads' });
  const previewId = await provision(ownerId, 'ws-preview');
  previewWorkspace = encodePublicId('workspace', previewId);
  await addAccount(previewId, ownerId, 'gram', { provider: 'instagram' });
  await addAccount(previewId, ownerId, 'sky', { provider: 'bluesky' });
  await root.withActor(CLI, async (trx) => {
    await trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: viewerId, role: 'viewer' })
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
        key_id: 'e'.repeat(16),
        token_hash: hashGrantToken(deps.keys.grant, GRANT_TOKEN),
        hash_key_version: 1,
      })
      .execute();
  });
  await root.destroy();
  owner = await login('owner');
  viewer = await login('viewer');
});

afterAll(async () => {
  await db?.destroy();
  await test?.stop();
});

describe('channel listing', () => {
  it('lists only this workspace’s channels with the public fields, for a session or a grant', async () => {
    const response = await get('', { cookie: owner });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('CANARY_');
    const { items } = JSON.parse(text) as { items: Record<string, unknown>[] };
    expect(items).toHaveLength(1);
    expect(Object.keys(items[0] ?? {}).sort()).toEqual([
      'accessExpiresAt',
      'accountKind',
      'connectedAt',
      'displayName',
      'handle',
      'id',
      'lastErrorCode',
      'postTypes',
      'preview',
      'profileUrl',
      'provider',
      'status',
      'statusReason',
    ]);
    expect(items[0]).toMatchObject({
      id: encodePublicId('socialAccount', ownAccountId),
      displayName: 'mine',
      status: 'needs_reauth',
      lastErrorCode: 'auth_revoked',
    });
    const granted = await get('', { authorization: `Bearer ${GRANT_TOKEN}` });
    expect(granted.status).toBe(200);
    expect(((await granted.json()) as { items: unknown[] }).items).toEqual(items);
  });

  it("returns each channel's resolved text rules, never its raw capabilities", async () => {
    const response = await app.request(`${BASE}/v1/workspaces/${rulesWorkspace}/channels`, {
      headers: { cookie: owner },
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('CANARY_');
    const { items } = JSON.parse(text) as { items: Record<string, unknown>[] };
    expect(items.map(({ provider, postTypes }) => ({ provider, postTypes }))).toEqual([
      {
        provider: 'mastodon',
        postTypes: [
          {
            id: 'post',
            text: [{ counting: 'mastodon', max: 1000, urlWeight: 30 }],
            maxLinks: null,
            imageAspect: null,
            video: null,
          },
          {
            id: 'video',
            text: [{ counting: 'mastodon', max: 1000, urlWeight: 30 }],
            maxLinks: null,
            imageAspect: null,
            video: {
              mimes: ['video/mp4'],
              maxBytes: 103_809_024,
              minDurationMs: 1,
              maxDurationMs: 900_000,
              aspect: null,
              maxFrameRate: 120,
              maxPixels: 8_294_400,
            },
          },
        ],
      },
      {
        provider: 'threads',
        postTypes: [
          {
            id: 'post',
            text: [{ counting: 'threads', max: 500 }],
            maxLinks: 5,
            imageAspect: null,
            video: null,
          },
          {
            id: 'video',
            text: [{ counting: 'threads', max: 500 }],
            maxLinks: 5,
            imageAspect: null,
            video: {
              mimes: ['video/mp4'],
              maxBytes: 1_000_000_000,
              minDurationMs: 1,
              maxDurationMs: 300_000,
              aspect: { min: { width: 1, height: 100 }, max: { width: 10, height: 1 } },
              maxFrameRate: null,
              maxPixels: null,
            },
          },
        ],
      },
    ]);
  });

  it('returns the preview archetype and the image aspect range from the manifest', async () => {
    const response = await app.request(`${BASE}/v1/workspaces/${previewWorkspace}/channels`, {
      headers: { cookie: owner },
    });
    expect(response.status).toBe(200);
    const { items } = (await response.json()) as {
      items: { provider: string; preview: string; postTypes: { imageAspect: unknown }[] }[];
    };
    const aspect = { min: { width: 4, height: 5 }, max: { width: 191, height: 100 } };
    expect(
      items.map(({ provider, preview, postTypes }) => ({
        provider,
        preview,
        aspects: postTypes.map((postType) => postType.imageAspect),
      })),
    ).toEqual([
      { provider: 'instagram', preview: 'media-grid', aspects: [aspect, aspect, null] },
      { provider: 'bluesky', preview: 'short-feed', aspects: [null] },
    ]);
  });

  it('lists the connectable providers only to a member who can connect, skipping an app whose key is not active', async () => {
    const response = await get('/providers', { cookie: owner });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { id: 'bluesky', availability: 'experimental' },
        { id: FAKE_PROVIDER, availability: 'stable' },
        { id: 'mastodon', availability: 'experimental' },
        { id: 'threads', availability: 'experimental' },
      ],
    });
    expect((await get('/providers', { cookie: viewer })).status).toBe(403);
    expect((await get('/providers', { authorization: `Bearer ${GRANT_TOKEN}` })).status).toBe(401);
  });
});
