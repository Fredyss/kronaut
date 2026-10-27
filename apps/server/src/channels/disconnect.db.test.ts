import { encodePublicId, type ProviderRuntime } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE_PROVIDER } from '../publish/testing.ts';
import {
  admin,
  app,
  asOwner,
  BASE,
  begin,
  CREDENTIALS,
  callback,
  connectedId,
  editor,
  owner,
  startConnect,
  stopConnect,
  viewer,
  workspaceId,
} from './testing.ts';

let test: TestDatabase;

const runtime: ProviderRuntime = {
  id: FAKE_PROVIDER,
  parseCredentials: (value) => value,
  async connectStart(_ctx, input) {
    const url = new URL('https://fake.example.test/authorize');
    url.searchParams.set('state', input.state);
    return { authorizationUrl: url.toString(), pending: {} };
  },
  connectFinish: async () => [
    {
      providerAccountId: 'remote-disconnect',
      accountKind: 'profile',
      displayName: 'Fake',
      credentials: CREDENTIALS,
      grantedScopes: ['write'],
      accessExpiresAt: Temporal.Now.instant().add({ hours: 1 }),
    },
  ],
  publish: () => Promise.reject(new Error('not used')),
  revoke: () => Promise.reject(new Error('the revoke job runs in the worker')),
};

beforeAll(async () => {
  test = await startTestDatabase();
  await startConnect(test, runtime);
});

afterAll(async () => {
  await stopConnect();
  await test?.stop();
});

async function disconnect(cookie: string, channelId: string): Promise<Response> {
  const workspace = encodePublicId('workspace', workspaceId);
  return await app.request(`${BASE}/v1/workspaces/${workspace}/channels/${channelId}/disconnect`, {
    method: 'POST',
    headers: { origin: BASE, cookie },
  });
}

function account(id: string) {
  return asOwner(async (trx) => {
    const row = await trx
      .selectFrom('social_accounts')
      .select(['status', 'status_reason'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    const audits = await trx
      .selectFrom('audit_events')
      .select(['action', 'actor_kind', 'surface', 'outcome', 'social_account_ids'])
      .where('resource_id', '=', id)
      .where('action', '=', 'channel.disconnected')
      .execute();
    return { ...row, audits };
  });
}

function revokeJobs(id: string) {
  return asOwner(async (trx) => {
    const { rows } = await sql<{ payload: { id: string; version: number } }>`
      select j.payload from graphile_worker._private_jobs j
      join graphile_worker._private_tasks t on t.id = j.task_id
      where t.identifier = 'revoke_credential'
        and j.payload->>'id' in (
          select c.id::text from account_credentials c where c.social_account_id = ${id})
    `.execute(trx);
    return rows.map((row) => row.payload);
  });
}

describe('channel disconnect', () => {
  it('lets an owner or admin disconnect, idempotently, and audits it once', async () => {
    const id = connectedId(await callback(await begin()));
    const channelId = encodePublicId('socialAccount', id);

    expect((await disconnect(editor, channelId)).status).toBe(403);
    expect((await disconnect(viewer, channelId)).status).toBe(403);
    expect((await account(id)).status).toBe('active');

    expect(await revokeJobs(id)).toEqual([]);
    expect((await disconnect(owner, channelId)).status).toBe(204);
    expect((await disconnect(admin, channelId)).status).toBe(204);
    expect(await revokeJobs(id)).toEqual([expect.objectContaining({ version: 1 })]);
    expect(await account(id)).toEqual({
      status: 'disconnected',
      status_reason: 'user',
      audits: [
        {
          action: 'channel.disconnected',
          actor_kind: 'user',
          surface: 'ui',
          outcome: 'ok',
          social_account_ids: [id],
        },
      ],
    });

    await callback(await begin());
    expect((await account(id)).status).toBe('active');
  });

  it('returns 404 for an unknown channel', async () => {
    const unknown = encodePublicId('socialAccount', '01900000-0000-7000-8000-000000000000');
    expect((await disconnect(owner, unknown)).status).toBe(404);
    expect((await disconnect(owner, 'acct_nope')).status).toBe(404);
  });
});
