import {
  type ConnectedAccount,
  type ConnectFinishInput,
  type ConnectStartInput,
  decodePublicId,
  type ProviderApp,
  ProviderFailure,
  type ProviderManifest,
  type ProviderRuntime,
} from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createKey } from '../cli/provider-apps.ts';
import { loadCredential, saveCredential } from '../credential-store.ts';
import { FAKE_PROVIDER, fakeManifest } from '../publish/testing.ts';
import { stateKey } from './connect.ts';
import {
  admin,
  app,
  asOwner,
  BASE,
  begin,
  boundKey,
  CANARY,
  CODE,
  CREDENTIALS,
  callback,
  connectedId,
  db,
  editor,
  fakeAppId,
  GRANT_TOKEN,
  gated,
  keyDeps,
  keyring,
  lines,
  owner,
  registerApp,
  rotate,
  SYSTEM,
  snapshot,
  start,
  startConnect,
  stopConnect,
  workspaceId,
} from './testing.ts';

let test: TestDatabase;
let remoteAccount = 'remote-1';
let finishFailure: Error | null = null;
const starts: ConnectStartInput[] = [];
const finishes: ConnectFinishInput[] = [];
const documentApps: ProviderApp[] = [];

const runtime: ProviderRuntime = {
  id: FAKE_PROVIDER,
  parseCredentials: (value) => value,
  async connectStart(_ctx, input) {
    starts.push(input);
    const url = new URL('https://fake.example.test/authorize');
    url.searchParams.set('state', input.state);
    url.searchParams.set('redirect_uri', input.redirectUri);
    return { authorizationUrl: url.toString(), pending: { verifier: CANARY } };
  },
  async connectFinish(_ctx, input) {
    finishes.push(input);
    if (finishFailure !== null) throw finishFailure;
    return [
      {
        providerAccountId: remoteAccount,
        accountKind: 'profile',
        handle: 'fake.handle',
        displayName: 'Fake',
        credentials: CREDENTIALS,
        grantedScopes: ['write'],
        accessExpiresAt: Temporal.Now.instant().add({ hours: 1 }),
      },
    ];
  },
  publish: () => Promise.reject(new Error('not used')),
  publicDocuments: (provider) => {
    documentApps.push(provider);
    return { 'client-metadata.json': { client_id: provider.clientId } };
  },
};

const FAKE_PAGES = 'fake_pages';
let pageAccounts: readonly ConnectedAccount<unknown>[] = [];

const pagesManifest: ProviderManifest = {
  ...fakeManifest,
  id: FAKE_PAGES,
  auth: { ...fakeManifest.auth, kind: 'page_token' },
};

const pagesRuntime: ProviderRuntime = {
  id: FAKE_PAGES,
  parseCredentials: (value) => value,
  async connectStart(_ctx, input) {
    const url = new URL('https://fake.example.test/dialog');
    url.searchParams.set('state', input.state);
    return { authorizationUrl: url.toString(), pending: {} };
  },
  connectFinish: async () => pageAccounts,
  publish: () => Promise.reject(new Error('not used')),
};

function pageAccount(id: string, accountKind = 'page'): ConnectedAccount<unknown> {
  return {
    providerAccountId: id,
    accountKind,
    displayName: `Page ${id}`,
    credentials: { accessToken: `CANARY_page_${id}` },
    grantedScopes: ['pages_manage_posts'],
  };
}

async function connectPages(): Promise<URL> {
  return await callback(await begin(owner, undefined, FAKE_PAGES), owner, FAKE_PAGES);
}

function pageRows() {
  return asOwner((trx) =>
    trx
      .selectFrom('social_accounts as s')
      .innerJoin('account_credentials as c', 'c.social_account_id', 's.id')
      .select(['s.id', 's.provider_account_id', 'c.kind'])
      .where('s.provider', '=', FAKE_PAGES)
      .orderBy('s.provider_account_id')
      .execute(),
  );
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startConnect(test, runtime, [{ manifest: pagesManifest, runtime: pagesRuntime }]);
  await registerApp(FAKE_PAGES);
});

afterAll(async () => {
  await stopConnect();
  await test?.stop();
});

describe('channel connect', () => {
  it('connects a new account end to end', async () => {
    remoteAccount = 'remote-new';
    const state = await begin(owner, ' alice.example\u0301 ');
    expect(starts.at(-1)?.loginHint).toBe('alice.exampl\u00e9');
    const location = await callback(state);
    const id = connectedId(location);
    expect(await snapshot('remote-new')).toEqual({ status: 'active', version: 1, audits: 1 });
    const credential = await asOwner(async (trx) => {
      const stored = await loadCredential(trx, keyring, {
        workspaceId,
        socialAccountId: id,
        kind: 'oauth',
      });
      return stored?.value;
    });
    expect(credential).toEqual(CREDENTIALS);
    expect(finishes.at(-1)).toMatchObject({
      pending: { verifier: CANARY },
      params: { state, code: CODE },
      redirectUri: `${BASE}/v1/oauth/${FAKE_PROVIDER}/callback`,
    });
  });

  it('reactivates a needs_reauth account and writes one channel.reconnected', async () => {
    remoteAccount = 'remote-reauth';
    const id = await asOwner(async (trx) => {
      const { id: accountId } = await trx
        .insertInto('social_accounts')
        .values({
          workspace_id: workspaceId,
          provider: FAKE_PROVIDER,
          provider_app_id: sql<string>`(select id from provider_apps limit 1)`,
          provider_account_id: 'remote-reauth',
          account_kind: 'profile',
          display_name: 'Old',
          status: 'needs_reauth',
          status_reason: 'auth_revoked',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await saveCredential(trx, keyring, {
        workspaceId,
        socialAccountId: accountId,
        kind: 'oauth',
        value: { accessToken: 'old' },
        grantedScopes: [],
      });
      await trx
        .insertInto('channel_incidents')
        .values([
          { workspace_id: workspaceId, social_account_id: accountId, kind: 'auth_revoked' },
          { workspace_id: workspaceId, social_account_id: accountId, kind: 'rate_limited' },
        ])
        .execute();
      return accountId;
    });
    expect(connectedId(await callback(await begin()))).toBe(id);
    const incidents = await asOwner((trx) =>
      trx
        .selectFrom('channel_incidents')
        .select(['kind', sql<boolean>`resolved_at is not null`.as('resolved')])
        .where('social_account_id', '=', id)
        .orderBy('kind')
        .execute(),
    );
    expect(incidents).toEqual([
      { kind: 'auth_revoked', resolved: true },
      { kind: 'rate_limited', resolved: false },
    ]);
    expect(await snapshot('remote-reauth')).toEqual({ status: 'active', version: 2, audits: 1 });
    const events = await asOwner((trx) =>
      trx.selectFrom('webhook_events').select('type').where('subject_id', '=', id).execute(),
    );
    expect(events).toEqual([{ type: 'channel.reconnected' }]);
  });

  it('accepts a state only once', async () => {
    remoteAccount = 'remote-once';
    const state = await begin();
    connectedId(await callback(state));
    const replay = await callback(state);
    expect(replay.searchParams.get('error')).toBe('state_invalid');
    expect(await snapshot('remote-once')).toEqual({ status: 'active', version: 1, audits: 1 });
  });

  it('binds the callback to the session that started it', async () => {
    remoteAccount = 'remote-hijack';
    const calls = finishes.length;
    const state = await begin();
    const hijack = await callback(state, admin);
    expect(hijack.searchParams.get('error')).toBe('session_mismatch');
    const retry = await callback(state);
    expect(retry.searchParams.get('error')).toBe('state_invalid');
    expect(finishes.length).toBe(calls);
    expect(await snapshot('remote-hijack')).toEqual({
      status: undefined,
      version: null,
      audits: 0,
    });
  });

  it('rejects an expired state', async () => {
    remoteAccount = 'remote-expired';
    const state = await begin();
    await db.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('ephemeral_kv')
        .set({ expires_at: sql<Date>`now() - interval '1 second'` })
        .where('key', '=', stateKey(state))
        .execute(),
    );
    expect((await callback(state)).searchParams.get('error')).toBe('state_invalid');
  });

  it('lets only a session holding channels:connect start', async () => {
    expect((await start({ cookie: editor })).status).toBe(403);
    expect((await start({ authorization: `Bearer ${GRANT_TOKEN}` })).status).toBe(401);
  });

  it('logs why a connect failed, as codes only, even for an unexpected error', async () => {
    lines.length = 0;
    finishFailure = new ProviderFailure({
      kind: 'permanent',
      code: 'scope_missing',
      detail: 'CANARY_detail',
    });
    try {
      expect((await callback(await begin())).searchParams.get('error')).toBe('provider_error');
    } finally {
      finishFailure = null;
    }
    const state = await begin();
    const query = new URLSearchParams({
      state,
      error: 'invalid_scope',
      error_description: 'CANARY_text',
    });
    await app.request(`${BASE}/v1/oauth/${FAKE_PROVIDER}/callback?${query}`, {
      headers: { cookie: owner },
    });
    finishFailure = new Error('CANARY_code in an unexpected error');
    try {
      expect((await callback(await begin())).searchParams.get('error')).toBe('provider_error');
    } finally {
      finishFailure = null;
    }
    expect(lines.filter((line) => line.includes('channel connect finish threw'))).toHaveLength(1);
    const warnings = lines
      .filter((line) => line.includes('channel connect failed'))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(warnings).toMatchObject([
      { code: 'provider_error', providerKind: 'permanent', providerCode: 'scope_missing' },
      { code: 'provider_error', callbackError: 'invalid_scope' },
      { code: 'provider_error', providerKind: 'unexpected' },
    ]);
    expect(lines.join('\n')).not.toContain('CANARY_');
  });

  it('keeps the state, the code and the pending secrets out of storage, logs and redirects', async () => {
    remoteAccount = 'remote-secret';
    lines.length = 0;
    const state = await begin();
    const stored = await db.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('ephemeral_kv')
        .select(sql<string>`value::text`.as('value'))
        .where('key', '=', stateKey(state))
        .executeTakeFirstOrThrow(),
    );
    expect(stored.value).not.toContain('CANARY_');
    expect(stored.value).not.toContain(state);
    const locations = [await callback(state), await callback(state)].map(String);
    expect(locations[1]).toContain('error=state_invalid');
    const lineWarnings = lines.filter((line) => line.includes('channel connect failed'));
    expect(lineWarnings).toHaveLength(1);
    for (const text of [...lines, ...locations]) {
      for (const secret of [state, CODE, 'CANARY_']) expect(text).not.toContain(secret);
    }
  });

  it('serves public documents past the Access gate and gates everything else', async () => {
    const response = await gated.request(`${BASE}/oauth/${FAKE_PROVIDER}/client-metadata.json`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(await response.json()).toEqual({ client_id: 'fake-client' });
    for (const [method, path] of [
      ['GET', `/oauth/${FAKE_PROVIDER}/x%2F..%2Fy`],
      ['GET', `/oauth/${FAKE_PROVIDER}/client-metadata.json/x`],
      ['POST', `/oauth/${FAKE_PROVIDER}/client-metadata.json`],
      ['GET', `/v1/oauth/${FAKE_PROVIDER}/callback`],
    ] as const) {
      const gatedResponse = await gated.request(`${BASE}${path}`, { method });
      expect(gatedResponse.status, `${method} ${path}`).toBe(403);
    }
    expect((await app.request(`${BASE}/oauth/${FAKE_PROVIDER}/jwks.json`)).status).toBe(404);
  });
});

describe('multi-account connect', () => {
  it('saves every returned account in one transaction, with the manifest credential kind', async () => {
    pageAccounts = [pageAccount('page-1'), pageAccount('page-2')];
    const location = await connectPages();
    const connected = (location.searchParams.get('connected') ?? '').split(',');
    const rows = await pageRows();
    expect(rows.map(({ provider_account_id, kind }) => ({ provider_account_id, kind }))).toEqual([
      { provider_account_id: 'page-1', kind: 'page_token' },
      { provider_account_id: 'page-2', kind: 'page_token' },
    ]);
    expect(connected.map((id) => decodePublicId('socialAccount', id))).toEqual(
      rows.map((row) => row.id),
    );

    pageAccounts = [pageAccount('page-3'), pageAccount('page-4', 'Not A Kind')];
    expect((await connectPages()).searchParams.get('error')).toBe('server_error');
    expect((await pageRows()).map((row) => row.provider_account_id)).toEqual(['page-1', 'page-2']);
  });

  it('refuses more than 100 accounts with too_many_accounts', async () => {
    pageAccounts = Array.from({ length: 101 }, (_, i) => pageAccount(`page-many-${i}`));
    const before = await pageRows();
    expect((await connectPages()).searchParams.get('error')).toBe('too_many_accounts');
    expect(await pageRows()).toEqual(before);
  });

  it('redirects an empty list with no_accounts and writes nothing', async () => {
    pageAccounts = [];
    const audits = () =>
      asOwner((trx) =>
        trx
          .selectFrom('audit_events')
          .select(sql<number>`count(*)::integer`.as('n'))
          .executeTakeFirstOrThrow(),
      );
    const before = { rows: await pageRows(), audits: await audits() };
    const location = await connectPages();
    expect(location.searchParams.get('error')).toBe('no_accounts');
    expect(location.searchParams.has('connected')).toBe(false);
    expect({ rows: await pageRows(), audits: await audits() }).toEqual(before);
  });
});

describe('client signing keys', () => {
  let first = '';

  it('binds a new connection to the active key', async () => {
    remoteAccount = 'remote-keyed';
    first = await rotate();
    const state = await begin();
    expect(starts.at(-1)?.app.signingKey?.id).toBe(first);
    expect(await boundKey(connectedId(await callback(state)))).toBe(first);
  });

  it('finishes with the key the start used when the key rotates mid-flow', async () => {
    remoteAccount = 'remote-rotated';
    const state = await begin();
    const second = await rotate();
    expect(second).not.toBe(first);
    const accountId = connectedId(await callback(state));
    expect(finishes.at(-1)?.app.signingKey?.id).toBe(first);
    expect(await boundKey(accountId)).toBe(first);
  });

  it('gives public documents every published key and never a signing key', async () => {
    await rotate();
    const appId = await fakeAppId();
    const next = await createKey(keyDeps(), appId);
    const response = await app.request(`${BASE}/oauth/${FAKE_PROVIDER}/client-metadata.json`);
    expect(response.status).toBe(200);
    const served = documentApps.at(-1);
    expect(served?.signingKey).toBeUndefined();
    const keys = await db.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('provider_app_keys')
        .select(['kid', 'status'])
        .where('provider_app_id', '=', appId)
        .orderBy('created_at')
        .execute(),
    );
    const kidsOf = (status: string) => keys.filter((k) => k.status === status).map((k) => k.kid);
    expect(served?.publishedKeys?.map((jwk) => jwk.kid)).toEqual([
      ...kidsOf('active'),
      next,
      ...kidsOf('retiring'),
    ]);
    expect(kidsOf('retiring')).toHaveLength(2);
    for (const jwk of served?.publishedKeys ?? []) expect(jwk).not.toHaveProperty('d');
  });
});
