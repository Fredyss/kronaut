import {
  type ConnectedAccount,
  decodePublicId,
  encodePublicId,
  type ProviderManifest,
  type ProviderRuntime,
} from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expectError, requestAs } from '../../../base/http/testing.ts';
import { loadCredential } from '../../../infrastructure/credentials/credential-store.ts';
import { FAKE_PROVIDER, fakeManifest } from '../../../steps/publish/testing.ts';
import {
  admin,
  app,
  asOwner,
  BASE,
  begin,
  callback,
  db,
  editor,
  keyring,
  owner,
  ownerId,
  registerApp,
  SYSTEM,
  startConnect,
  stopConnect,
  workspaceId,
} from '../testing.ts';

const FAKE_PICKS = 'fake_picks';
let offered: readonly ConnectedAccount<unknown>[] = [];
let test: TestDatabase;

const picksManifest: ProviderManifest = {
  ...fakeManifest,
  id: FAKE_PICKS,
  auth: { kind: 'oauth', refresh: 'none', warnLeadMs: 0, connectPicker: 'kronaut' },
};

const picksRuntime: ProviderRuntime = {
  id: FAKE_PICKS,
  parseCredentials: (value) => value,
  async connectStart(_ctx, input) {
    const url = new URL('https://fake.example.test/install');
    url.searchParams.set('state', input.state);
    return { authorizationUrl: url.toString(), pending: {} };
  },
  connectFinish: async () => offered,
  publish: () => Promise.reject(new Error('not used')),
};

const fakeRuntime: ProviderRuntime = {
  ...picksRuntime,
  id: FAKE_PROVIDER,
  connectFinish: async () => [],
};

function channel(id: string): ConnectedAccount<unknown> {
  return {
    providerAccountId: id,
    accountKind: 'channel',
    displayName: `#chan-${id}`,
    handle: 'Ada Lounge',
    credentials: { guildId: '1', channelId: id },
    grantedScopes: ['bot'],
  };
}

const ws = () => encodePublicId('workspace', workspaceId);
const url = (selectionId: string, workspace = ws()) =>
  `${BASE}/v1/workspaces/${workspace}/channels/selections/${selectionId}`;

async function offer(ids: readonly string[]): Promise<string> {
  offered = ids.map(channel);
  const location = await callback(await begin(owner, undefined, FAKE_PICKS), owner, FAKE_PICKS);
  expect(`${location.origin}${location.pathname}`).toBe(`${BASE}/channels`);
  expect(location.searchParams.get('error')).toBeNull();
  expect(location.searchParams.get('connected')).toBeNull();
  return location.searchParams.get('pick') ?? '';
}

function read(selectionId: string, cookie = owner, workspace = ws()) {
  return requestAs(app, { cookie }, { method: 'GET', url: url(selectionId, workspace) });
}

function confirm(selectionId: string, accounts: readonly string[], key?: string) {
  return requestAs(
    app,
    { cookie: owner },
    { method: 'POST', url: `${url(selectionId)}/confirm`, body: { accounts }, key },
  );
}

function accountRows() {
  return asOwner((trx) =>
    trx
      .selectFrom('social_accounts')
      .select(['id', 'provider_account_id', 'display_name'])
      .where('provider', '=', FAKE_PICKS)
      .orderBy('provider_account_id')
      .execute(),
  );
}

async function otherWorkspace(): Promise<string> {
  return await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org 2', 'Second', 'ws-second', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startConnect(test, fakeRuntime, [{ manifest: picksManifest, runtime: picksRuntime }]);
  await registerApp(FAKE_PICKS);
});

afterAll(async () => {
  await stopConnect();
  await test?.stop();
});

describe('connect selection', () => {
  it('offers the candidates instead of saving them, and sealed', async () => {
    const selectionId = await offer(['10', '20']);
    expect(selectionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await accountRows()).toEqual([]);
    const response = await read(selectionId);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: FAKE_PICKS,
      items: [
        { id: '10', displayName: '#chan-10', handle: 'Ada Lounge' },
        { id: '20', displayName: '#chan-20', handle: 'Ada Lounge' },
      ],
    });
    const stored = await db.withActor(SYSTEM, (trx) =>
      trx.selectFrom('ephemeral_kv').select('value').where('key', 'like', 'oauth:pick:%').execute(),
    );
    expect(JSON.stringify(stored)).not.toContain('chan-10');
  });

  it('refuses another user, another workspace and a role without connect', async () => {
    const selectionId = await offer(['30']);
    await expectError(await read(selectionId, admin), 404, 'not_found');
    await expectError(await read(selectionId, editor), 403, 'forbidden');
    const second = encodePublicId('workspace', await otherWorkspace());
    await expectError(await read(selectionId, owner, second), 404, 'not_found');
    expect((await read(selectionId)).status).toBe(200);
  });

  it('connects only a subset of what was offered, once', async () => {
    const selectionId = await offer(['40', '50', '60']);
    const outside = await confirm(selectionId, ['40', '99']);
    const issue = await expectError(outside, 422, 'unprocessable');
    expect(issue.details).toEqual([{ path: 'body.accounts', code: 'not_offered' }]);
    expect(await accountRows()).toEqual([]);

    const key = crypto.randomUUID();
    const response = await confirm(selectionId, ['60', '40', '40'], key);
    expect(response.status).toBe(200);
    const { connected } = (await response.json()) as { connected: string[] };
    const rows = await accountRows();
    expect(rows.map((row) => row.provider_account_id)).toEqual(['40', '60']);
    const ids = connected.map((id) => decodePublicId('socialAccount', id));
    expect(new Set(ids)).toEqual(new Set(rows.map((row) => row.id)));

    const credential = await asOwner((trx) =>
      loadCredential(trx, keyring, {
        workspaceId,
        socialAccountId: rows[0]?.id ?? '',
        kind: 'oauth',
      }),
    );
    expect(credential?.value).toEqual({ guildId: '1', channelId: '40' });
    const audits = await asOwner((trx) =>
      trx
        .selectFrom('audit_events')
        .select('action')
        .where(
          'resource_id',
          'in',
          rows.map((row) => row.id),
        )
        .execute(),
    );
    expect(audits.map((row) => row.action)).toEqual(['channel.connected', 'channel.connected']);

    const replay = await confirm(selectionId, ['60', '40', '40'], key);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ connected });
    await expectError(await confirm(selectionId, ['50']), 404, 'not_found');
    await expectError(await read(selectionId), 404, 'not_found');
  });

  it('caps the selection at the connect limit', async () => {
    const ids = Array.from({ length: 101 }, (_, n) => `${1000 + n}`);
    const selectionId = await offer(ids);
    const issue = await expectError(await confirm(selectionId, ids), 422, 'unprocessable');
    expect(issue.details).toEqual([{ path: 'body.accounts', code: 'too_many_accounts' }]);
    expect((await read(selectionId)).status).toBe(200);
  });

  it('expires after its time to live', async () => {
    const selectionId = await offer(['70']);
    await db.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('ephemeral_kv')
        .set({ expires_at: sql<Date>`now() - interval '1 second'` })
        .where('key', 'like', 'oauth:pick:%')
        .execute(),
    );
    await expectError(await read(selectionId), 404, 'not_found');
    await expectError(await confirm(selectionId, ['70']), 404, 'not_found');
  });

  it('cancels without connecting anything, and a repeat is harmless', async () => {
    const selectionId = await offer(['80']);
    const cancel = () =>
      requestAs(app, { cookie: owner }, { method: 'DELETE', url: url(selectionId) });
    expect((await cancel()).status).toBe(204);
    expect((await cancel()).status).toBe(204);
    await expectError(await read(selectionId), 404, 'not_found');
    expect((await accountRows()).map((row) => row.provider_account_id)).not.toContain('80');
  });

  it('fails an empty offer with no_accounts', async () => {
    offered = [];
    const location = await callback(await begin(owner, undefined, FAKE_PICKS), owner, FAKE_PICKS);
    expect(location.searchParams.get('error')).toBe('no_accounts');
  });
});
