import { randomBytes, randomUUID } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import { createKeyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Auth,
  BASE,
  createTestInstance,
  createTestUser,
  errorOf,
  loginAs,
  requestAs,
} from '../../../base/http/testing.ts';
import { createProviderRegistry } from '../../../base/providers/providers.ts';
import { saveCredential } from '../../../infrastructure/credentials/credential-store.ts';
import { installJobQueue } from '../../../infrastructure/jobs/job-queue.ts';

const CLI: Actor = { kind: 'cli' };
const YOUTUBE = 'youtube';

let test: TestDatabase;
let db: Database;
let owner: Database;
let app: Hono;
let auth: Auth;
let workspace: string;
let channel: string;
let video: string;

async function seedWorkspace(userId: string): Promise<string> {
  return await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', 'ws-tube', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
}

async function seedChannel(workspaceId: string, userId: string, appId: string): Promise<string> {
  const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  return await db.withTenant(workspaceId, { kind: 'user', id: userId }, async (trx) => {
    const { id } = await trx
      .insertInto('social_accounts')
      .values({
        workspace_id: workspaceId,
        provider: YOUTUBE,
        provider_app_id: appId,
        provider_account_id: 'UCaaaaaaaaaaaaaaaaaaaaaa',
        account_kind: 'channel',
        display_name: 'Channel',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await saveCredential(trx, keyring, {
      workspaceId,
      socialAccountId: id,
      kind: 'oauth',
      value: { accessToken: 'access', refreshToken: 'refresh' },
      grantedScopes: [],
    });
    return encodePublicId('socialAccount', id);
  });
}

async function seedVideo(workspaceId: string, userId: string): Promise<string> {
  return await db.withTenant(workspaceId, { kind: 'user', id: userId }, async (trx) => {
    const { id } = await trx
      .insertInto('media_assets')
      .values({
        workspace_id: workspaceId,
        kind: 'video',
        state: 'ready',
        storage_key: randomBytes(32).toString('hex'),
        sha256: randomBytes(32),
        mime: 'video/mp4',
        bytes: '1000',
        width: 1280,
        height: 720,
        duration_ms: 10_000,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return encodePublicId('media', id);
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
  const providers = createProviderRegistry(
    manifests.filter((manifest) => manifest.id === YOUTUBE),
    runtimes.filter((runtime) => runtime.id === YOUTUBE),
    () => ({}) as HttpClient,
  );
  app = createTestInstance({ db, providers }).app;
  const userId = await createTestUser(db, 'owner');
  const workspaceId = await seedWorkspace(userId);
  workspace = encodePublicId('workspace', workspaceId);
  const appId = randomUUID();
  const operator = createDatabase({ connectionString: test.operatorUrl });
  await operator.withActor(CLI, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({ id: appId, provider: YOUTUBE, client_id: '123-abc.apps.googleusercontent.com' })
      .execute(),
  );
  await operator.destroy();
  channel = await seedChannel(workspaceId, userId, appId);
  video = await seedVideo(workspaceId, userId);
  auth = await loginAs(app, 'owner');
});

afterAll(async () => {
  await db?.destroy();
  await owner?.destroy();
  await test?.stop();
});

function call(path: string, body: unknown): Promise<Response> {
  const url = `${BASE}/v1/workspaces/${workspace}/${path}`;
  return requestAs(app, auth, { method: 'POST', url, body });
}

async function draft(settings?: Record<string, unknown>) {
  const response = await call('posts', {
    items: [
      {
        doc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Behind the scenes' }] }],
        },
        media: [{ mediaId: video }],
      },
    ],
    destinations: [
      { accountId: channel, publishType: 'video', ...(settings === undefined ? {} : { settings }) },
    ],
  });
  expect(response.status).toBe(201);
  return (await response.json()) as {
    id: string;
    version: number;
    destinations: { state: string }[];
  };
}

describe('required provider settings', () => {
  it.each([
    ['no title', undefined],
    ['a blank title', { title: ' \t' }],
  ])('saves a YouTube draft with %s but refuses to schedule it', async (_name, settings) => {
    const post = await draft(settings);
    expect(post.destinations).toMatchObject([{ state: 'draft' }]);
    const response = await call(`posts/${post.id}/schedule`, {
      expectedVersion: post.version,
      mode: 'asap',
    });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'preflight_failed',
      details: [{ path: 'destinations.0.settings.title', code: 'setting_required' }],
    });
  });

  it('schedules a YouTube video that has a title', async () => {
    const post = await draft({ title: 'Launch day', privacy: 'unlisted' });
    const response = await call(`posts/${post.id}/schedule`, {
      expectedVersion: post.version,
      mode: 'asap',
    });
    expect(response.status).toBe(200);
  });
});
