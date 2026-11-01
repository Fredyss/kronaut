import { randomBytes, randomUUID } from 'node:crypto';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database, type TenantDb } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { type Logger, pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { expect } from 'vitest';
import { saveCredential } from '../credential-store.ts';
import { cronTasks } from '../cron.ts';
import {
  type Auth,
  BASE,
  createTestInstance,
  createTestUser,
  insertTestGrant,
  loginAs,
  randomGrantToken,
  requestAs,
} from '../http/testing.ts';
import { installJobQueue } from '../job-queue.ts';
import type { MediaAccess } from '../media/access.ts';
import { createProviderRegistry } from '../providers.ts';
import {
  FAKE_PROVIDER,
  type FakeProvider,
  type FixtureUrls,
  fakeProvider,
} from '../publish/testing.ts';
import { parseSnapshot, publishItems, resolveDestination } from '../snapshot.ts';
import type { PostDto } from './dto.ts';

export {
  type Auth,
  BASE,
  type ErrorResponse,
  errorOf,
  PASSWORD,
} from '../http/testing.ts';

export const SYSTEM: Actor = { kind: 'system' };
export const CLI: Actor = { kind: 'cli' };
const GRANT_TOKEN = `kro_${'a'.repeat(16)}_${'b'.repeat(32)}`;
export const TZ = 'Europe/Bratislava';

export let keyring: Keyring;
export let fake: FakeProvider;
export let providers: ReturnType<typeof createProviderRegistry>;
export let owner: Database;
export let db: Database;
export let app: Hono;
export let workspaceId: string;
export let ownerId: string;
export let ownerAuth: Auth;
export let viewerAuth: Auth;
export const grantAuth: Auth = { bearer: GRANT_TOKEN };
export let accountA: string;
export let accountB: string;
let appId: string;
let grantKey: Uint8Array;
export let readyMedia: string;
export let processingMedia: string;

export function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

export function createUser(label: string): Promise<string> {
  return createTestUser(db, label);
}

export function login(label: string): Promise<Auth> {
  return loginAs(app, label);
}

export async function insertAccount(label: string, ws: string = workspaceId): Promise<string> {
  return await db.withTenant(ws, { kind: 'user', id: ownerId }, async (trx) => {
    const { id } = await trx
      .insertInto('social_accounts')
      .values({
        workspace_id: ws,
        provider: FAKE_PROVIDER,
        provider_app_id: appId,
        provider_account_id: `fake-${label}`,
        account_kind: 'profile',
        display_name: label,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await saveCredential(trx, keyring, {
      workspaceId: ws,
      socialAccountId: id,
      kind: 'oauth',
      value: { token: 'fake-token' },
      grantedScopes: [],
    });
    return encodePublicId('socialAccount', id);
  });
}

async function insertMedia(state: 'ready' | 'processing'): Promise<string> {
  return await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, async (trx) => {
    const { id } = await trx
      .insertInto('media_assets')
      .values({
        workspace_id: workspaceId,
        kind: 'image',
        state,
        storage_key: randomBytes(32).toString('hex'),
        sha256: state === 'ready' ? randomBytes(32) : null,
        mime: state === 'ready' ? 'image/png' : null,
        bytes: state === 'ready' ? '10' : null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return encodePublicId('media', id);
  });
}

export async function callWithKey(
  method: 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  auth: Auth,
  { body, key }: { readonly body?: unknown; readonly key: string },
): Promise<Response> {
  const url = `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/${path}`;
  return await requestAs(app, auth, { method, url, body, key });
}

export async function call(
  method: 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  auth: Auth,
  body?: unknown,
): Promise<Response> {
  return await callWithKey(method, path, auth, { body, key: randomUUID() });
}

export async function create(auth: Auth, body: unknown): Promise<PostDto> {
  const response = await call('POST', 'posts', auth, body);
  expect(response.status).toBe(201);
  return (await response.json()) as PostDto;
}

export function draft(accountId: string = accountA) {
  return { items: [{ doc: doc('Ahoj') }], destinations: [{ accountId, publishType: 'post' }] };
}

export function internal(publicId: string): string {
  const id = decodePublicId('post', publicId);
  if (id === null) throw new Error(`not a post id: ${publicId}`);
  return id;
}

export async function startPosts(
  test: FixtureUrls,
  logger: Logger = pino({ level: 'silent' }),
  clock: () => Temporal.Instant = () => Temporal.Now.instant(),
): Promise<void> {
  owner = createDatabase({ connectionString: test.ownerUrl });
  db = createDatabase({ connectionString: test.appUrl });
  const operator = createDatabase({ connectionString: test.operatorUrl });
  await installJobQueue(test.ownerUrl, owner);
  keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  fake = fakeProvider();
  providers = createProviderRegistry([fake.manifest], [fake.runtime], () => ({}) as HttpClient);
  const instance = createTestInstance({
    db,
    keyring,
    providers,
    logger,
    clock,
    cronTasks: cronTasks(true),
    instanceAdmins: ['owner@example.test'],
  });
  app = instance.app;
  grantKey = instance.deps.keys.grant;

  ownerId = await createUser('owner');
  const viewerId = await createUser('viewer');
  workspaceId = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', 'ws-posts', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  appId = randomUUID();
  await operator.withActor(CLI, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({ id: appId, provider: FAKE_PROVIDER, client_id: 'fake-client' })
      .execute(),
  );
  await operator.destroy();
  await owner.withActor(CLI, async (trx) => {
    await trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: viewerId, role: 'viewer' })
      .execute();
    await insertGrantRow(trx, GRANT_TOKEN, {
      scopes: ['posts:read', 'posts:draft', 'posts:schedule'],
    });
  });
  accountA = await insertAccount('Account A');
  accountB = await insertAccount('Account B');
  readyMedia = await insertMedia('ready');
  processingMedia = await insertMedia('processing');
  ownerAuth = await login('owner');
  viewerAuth = await login('viewer');
}

export interface GrantSpec {
  readonly scopes: readonly string[];
  readonly accounts?: readonly string[];
}

async function insertGrantRow(trx: TenantDb, token: string, spec: GrantSpec): Promise<void> {
  const accounts = spec.accounts ?? [];
  const grantId = await insertTestGrant(trx, grantKey, token, {
    workspaceId,
    sponsorUserId: ownerId,
    scopes: spec.scopes,
    restricted: spec.accounts !== undefined,
  });
  for (const account of accounts) {
    await trx
      .insertInto('access_scopes')
      .values({
        workspace_id: workspaceId,
        grant_id: grantId,
        social_account_id: decodePublicId('socialAccount', account) ?? '',
      })
      .execute();
  }
}

export async function insertGrant(spec: GrantSpec): Promise<Auth> {
  const token = randomGrantToken();
  await owner.withActor(CLI, (trx) => insertGrantRow(trx, token, spec));
  return { bearer: token };
}

export async function stopPosts(): Promise<void> {
  await db?.destroy();
  await owner?.destroy();
}

export const media: MediaAccess = {
  signedUrl: () => Promise.reject(new Error('no media in these tests')),
  read: () => Promise.reject(new Error('no media in these tests')),
};

function isUnambiguous(local: Temporal.PlainDateTime): boolean {
  try {
    local.toZonedDateTime(TZ, { disambiguation: 'reject' });
    return true;
  } catch {
    return false;
  }
}

// Near a DST change the wall time can be repeated or skipped, which the schedule records as
// non-exact; step past it so the tests behave the same on every night of the year.
export function inMinutes(minutes: number): string {
  let local = Temporal.Now.zonedDateTimeISO(TZ)
    .add({ minutes })
    .toPlainDateTime()
    .round({ smallestUnit: 'minute', roundingMode: 'floor' });
  while (!isUnambiguous(local)) local = local.add({ hours: Math.sign(minutes) || 1 });
  return local.toString();
}

export function scheduleCall(
  post: PostDto,
  body: object,
  auth: Auth = ownerAuth,
): Promise<Response> {
  return call('POST', `posts/${post.id}/schedule`, auth, {
    expectedVersion: post.version,
    ...body,
  });
}

export async function scheduled(
  post: PostDto,
  scheduleLocal: string = inMinutes(120),
): Promise<PostDto> {
  const response = await scheduleCall(post, { mode: 'instant', scheduleLocal, scheduleTz: TZ });
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

export function revisionsOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_revisions')
      .select(['post_version', 'reason'])
      .where('post_id', '=', internal(post.id))
      .orderBy('post_version')
      .execute(),
  );
}

export async function jobRunAt(destinationId: string): Promise<Date | undefined> {
  const result = await owner.withActor(CLI, (trx) =>
    sql<{ run_at: Date }>`
      select run_at from graphile_worker.jobs where key = ${`dest:${destinationId}`}
    `.execute(trx),
  );
  return result.rows[0]?.run_at;
}

let savedTextSerial = 0;

export async function savedText(text: string): Promise<{ readonly id: string }> {
  savedTextSerial += 1;
  const response = await call('POST', 'saved-texts', ownerAuth, {
    name: `Text ${savedTextSerial}`,
    doc: doc(text),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

export function signCall(savedTextId: string | null, accountId: string) {
  return call('PUT', `channels/${accountId}/saved-text`, ownerAuth, { savedTextId });
}

export async function sign(savedTextId: string | null, accountId: string = accountA) {
  expect((await signCall(savedTextId, accountId)).status).toBe(200);
}

export async function fetched(post: PostDto) {
  return (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
}

export async function rendered(post: PostDto) {
  const { snapshot } = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations as d')
      .innerJoin('post_revisions as r', (join) =>
        join
          .onRef('r.workspace_id', '=', 'd.workspace_id')
          .onRef('r.post_id', '=', 'd.post_id')
          .onRef('r.post_version', '=', 'd.frozen_post_version'),
      )
      .select('r.snapshot')
      .where('d.post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
  const parsed = parseSnapshot(snapshot);
  const [destination] = parsed.destinations;
  if (destination === undefined) throw new Error('the snapshot has no destination');
  const key = { socialAccountId: destination.socialAccountId, publishType: 'post' };
  return { destination, items: publishItems(resolveDestination(parsed, key)) };
}

export function texts({ items }: Awaited<ReturnType<typeof rendered>>) {
  return items.map((item) => item.text);
}
