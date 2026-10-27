import {
  type ConnectStartInput,
  encodePublicId,
  ProviderFailure,
  type ProviderManifest,
  type ProviderRuntime,
  type RegisterAppInput,
} from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE_PROVIDER, fakeManifest } from '../publish/testing.ts';
import { registrationBucketKey } from './instance-apps.ts';
import {
  app,
  asOwner,
  BASE,
  CANARY,
  CODE,
  connectedId,
  db,
  lines,
  owner,
  SYSTEM,
  startConnect,
  stopConnect,
  workspaceId,
} from './testing.ts';

const FAKE_INSTANCE = 'fake_instance';
const HOST = 'social.example.org';
const CAPABILITIES = { instance: { maxCharacters: 500 }, fetchedAt: '2026-10-26T12:00:00Z' };

let test: TestDatabase;
let registerFailure: Error | null = null;
let finishFailure: Error | null = null;
const registrations: RegisterAppInput[] = [];
const starts: ConnectStartInput[] = [];

const manifest: ProviderManifest = {
  ...fakeManifest,
  id: FAKE_INSTANCE,
  auth: { ...fakeManifest.auth, instanceScoped: true },
  egressHosts: ['*'],
};

const runtime: ProviderRuntime = {
  id: FAKE_INSTANCE,
  parseCredentials: (value) => value,
  async registerApp(_ctx, input) {
    registrations.push(input);
    if (registerFailure !== null) throw registerFailure;
    const n = registrations.length;
    return { clientId: `client-${n}`, clientSecret: `CANARY_secret_${n}` };
  },
  async connectStart(_ctx, input) {
    starts.push(input);
    const url = new URL(`https://${input.app.instanceHost}/oauth/authorize`);
    url.searchParams.set('state', input.state);
    return { authorizationUrl: url.toString(), pending: { verifier: CANARY } };
  },
  async connectFinish(_ctx, input) {
    if (finishFailure !== null) throw finishFailure;
    return [
      {
        providerAccountId: `42@${input.app.instanceHost}`,
        accountKind: 'personal',
        handle: `@alice@${input.app.instanceHost}`,
        displayName: 'Alice',
        credentials: { accessToken: 'CANARY_access' },
        grantedScopes: ['write:statuses'],
        capabilities: CAPABILITIES,
      },
    ];
  },
  publish: () => Promise.reject(new Error('not used')),
};

async function request(body: Record<string, unknown>): Promise<Response> {
  return await app.request(
    `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/channels/connect`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, cookie: owner },
      body: JSON.stringify({ provider: FAKE_INSTANCE, ...body }),
    },
  );
}

async function detail(response: Response, status = 422) {
  expect(response.status).toBe(status);
  const body = (await response.json()) as {
    error: { code: string; details?: { path: string; code: string }[] };
  };
  return { code: body.error.code, details: body.error.details };
}

async function begin(instance: string): Promise<string> {
  const response = await request({ instance });
  expect(response.status).toBe(200);
  const { authorizationUrl } = (await response.json()) as { authorizationUrl: string };
  return new URL(authorizationUrl).searchParams.get('state') ?? '';
}

async function callback(state: string): Promise<URL> {
  const query = new URLSearchParams({ state, code: CODE });
  const response = await app.request(`${BASE}/v1/oauth/${FAKE_INSTANCE}/callback?${query}`, {
    headers: { cookie: owner },
  });
  expect(response.status).toBe(303);
  return new URL(response.headers.get('location') ?? '');
}

function apps(host = HOST) {
  return db.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('provider_apps')
      .select(['id', 'client_id', 'status', 'instance_host'])
      .select(sql<string>`encode(client_secret_ciphertext, 'escape')`.as('sealed'))
      .where('provider', '=', FAKE_INSTANCE)
      .where('instance_host', '=', host)
      .orderBy('created_at')
      .execute(),
  );
}

function resetBucket(): Promise<unknown> {
  return db.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('rate_buckets')
      .set({ window_start: sql<Date>`now() - interval '2 hours'` })
      .where('key', '=', registrationBucketKey(workspaceId))
      .execute(),
  );
}

beforeAll(async () => {
  test = await startTestDatabase();
  const { registerApp: _register, ...instanceWide } = runtime;
  await startConnect(test, { ...instanceWide, id: FAKE_PROVIDER }, [{ manifest, runtime }]);
});

afterAll(async () => {
  await stopConnect();
  await test?.stop();
});

describe('instance-scoped connect start', () => {
  it('requires an instance for an instance-scoped provider and refuses it for others', async () => {
    expect(await detail(await request({}))).toEqual({
      code: 'unprocessable',
      details: [{ path: 'body.instance', code: 'required' }],
    });
    expect(await detail(await request({ provider: FAKE_PROVIDER, instance: HOST }))).toEqual({
      code: 'unprocessable',
      details: [{ path: 'body.instance', code: 'not_supported' }],
    });
    for (const instance of ['localhost', `${HOST}:8443`, `https://${HOST}/about`, '10.0.0.1']) {
      expect((await detail(await request({ instance }))).details).toEqual([
        { path: 'body.instance', code: 'invalid' },
      ]);
    }
    expect(registrations).toHaveLength(0);
  });

  it('registers a sealed app on the first connect and reuses it on the next', async () => {
    await begin('Social.Example.ORG');
    expect(registrations).toEqual([
      {
        instanceHost: HOST,
        redirectUri: `${BASE}/v1/oauth/${FAKE_INSTANCE}/callback`,
        clientName: 'Kronaut',
      },
    ]);
    const [row] = await apps();
    expect(row).toMatchObject({ client_id: 'client-1', status: 'active', instance_host: HOST });
    expect(row?.sealed).not.toContain('CANARY_secret');
    expect(starts.at(-1)?.app).toMatchObject({
      clientId: 'client-1',
      clientSecret: 'CANARY_secret_1',
      instanceHost: HOST,
    });

    await begin(`https://${HOST}/`);
    expect(registrations).toHaveLength(1);
    expect(await apps()).toHaveLength(1);
    expect(starts.at(-1)?.app.clientId).toBe('client-1');
  });

  it('does not reuse an app registered for another callback', async () => {
    const stale = 'stale.example.org';
    await resetBucket();
    await db.withActor(SYSTEM, (trx) =>
      trx
        .insertInto('provider_apps')
        .values({
          provider: FAKE_INSTANCE,
          instance_host: stale,
          client_id: 'stale-client',
          redirect_uri: 'https://old.example.com/v1/oauth/callback',
        })
        .execute(),
    );
    const before = registrations.length;
    await begin(stale);
    expect(registrations).toHaveLength(before + 1);
    expect(starts.at(-1)?.app.clientId).not.toBe('stale-client');
    expect(await apps(stale)).toHaveLength(2);
  });

  it('maps registration failures and stores no app', async () => {
    const cases: [ProviderFailure, number, { path: string; code: string }][] = [
      [new ProviderFailure({ kind: 'transient' }), 503, { path: '', code: '' }],
      [
        new ProviderFailure({ kind: 'permanent', code: 'app_registration_rejected' }),
        422,
        { path: 'body.instance', code: 'provider_rejected' },
      ],
      [
        new ProviderFailure({ kind: 'app_config', code: 'x' }),
        422,
        { path: 'body.provider', code: 'app_config' },
      ],
    ];
    try {
      for (const [failure, status, expected] of cases) {
        registerFailure = failure;
        const { details } = await detail(await request({ instance: 'down.example.net' }), status);
        if (status === 422) expect(details).toEqual([expected]);
      }
    } finally {
      registerFailure = null;
    }
    expect(await apps('down.example.net')).toEqual([]);
  });

  it('caps registrations at 10 per workspace per hour', async () => {
    await resetBucket();
    const before = registrations.length;
    for (let i = 0; i < 10; i += 1) await begin(`s${i}.example.net`);
    expect(await detail(await request({ instance: 's10.example.net' }), 429)).toMatchObject({
      code: 'rate_limited',
    });
    expect(registrations.length - before).toBe(10);
    await begin(HOST);
    expect(registrations.length - before).toBe(10);
    await resetBucket();
    await begin('s10.example.net');
    expect(registrations.length - before).toBe(11);
  });
});

describe('instance-scoped connect callback', () => {
  it('stores the account with its capabilities and an id qualified by the host', async () => {
    const id = connectedId(await callback(await begin(HOST)));
    const [instanceApp] = await apps();
    const row = await asOwner((trx) =>
      trx
        .selectFrom('social_accounts')
        .select(['provider_account_id', 'handle', 'capabilities', 'provider_app_id'])
        .where('id', '=', id)
        .executeTakeFirstOrThrow(),
    );
    expect(row).toEqual({
      provider_account_id: `42@${HOST}`,
      handle: `@alice@${HOST}`,
      capabilities: CAPABILITIES,
      provider_app_id: instanceApp?.id,
    });
  });

  it('marks the app misconfigured on invalid_client so the next start registers again', async () => {
    await resetBucket();
    const state = await begin(HOST);
    finishFailure = new ProviderFailure({ kind: 'app_config', code: 'invalid_client' });
    try {
      expect((await callback(state)).searchParams.get('error')).toBe('app_config');
    } finally {
      finishFailure = null;
    }
    const [old] = await apps();
    expect(old?.status).toBe('misconfigured');
    const before = registrations.length;
    await begin(HOST);
    expect(registrations.length).toBe(before + 1);
    const rows = await apps();
    expect(rows.map((r) => r.status)).toEqual(['misconfigured', 'active']);
    expect(starts.at(-1)?.app.clientId).toBe(rows[1]?.client_id);
  });

  it('never logs the client secret or the access token', () => {
    expect(lines.join('\n')).not.toContain('CANARY_');
  });
});
