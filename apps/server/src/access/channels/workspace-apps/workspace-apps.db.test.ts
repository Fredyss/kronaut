import { randomUUID } from 'node:crypto';
import {
  type ConnectStartInput,
  encodePublicId,
  type ProviderManifest,
  type ProviderRuntime,
} from '@kronaut/core';
import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerSecretApp } from '../../../actors/cli/provider-apps.ts';
import { createTestUser, requestAs, type TestRequest } from '../../../base/http/testing.ts';
import {
  loadProviderApp,
  sealWorkspaceAppSecret,
} from '../../../infrastructure/credentials/credential-store.ts';
import { flagApp } from '../../../steps/publish/incidents.ts';
import { FAKE_PROVIDER, fakeManifest } from '../../../steps/publish/testing.ts';
import {
  admin,
  app,
  asOwner,
  BASE,
  db,
  editor,
  GRANT_TOKEN,
  keyDeps,
  keyring,
  lines,
  owner,
  registerApp,
  SYSTEM,
  start,
  startConnect,
  stopConnect,
  viewer,
  workspaceId,
} from '../testing.ts';

const X = 'x_com';
const SECRET = 'CANARY_workspace_client_secret';
const NEW_SECRET = 'CANARY_workspace_rotated_secret';
const REVIVED_SECRET = 'CANARY_workspace_revived_secret';
const PUBLIC = 'https://kronaut.example.test';

let test: TestDatabase;
let root: Database;
let otherWorkspace: string;
const starts: ConnectStartInput[] = [];

const manifest: ProviderManifest = { ...fakeManifest, id: X, workspaceApps: true };
const runtime: ProviderRuntime = {
  id: X,
  parseCredentials: (value) => value,
  async connectStart(_ctx, input) {
    starts.push(input);
    return { authorizationUrl: 'https://x.example.test/authorize', pending: {} };
  },
  connectFinish: () => Promise.reject(new Error('not used')),
  publish: () => Promise.reject(new Error('not used')),
};

function url(path = ''): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/provider-apps${path}`;
}

async function call(cookie: string, request: Omit<TestRequest, 'url'> & { path?: string }) {
  const response = await requestAs(app, { cookie }, { ...request, url: url(request.path) });
  const text = await response.text();
  expect(text).not.toContain('CANARY');
  return { status: response.status, json: text === '' ? null : JSON.parse(text) };
}

function register(body: Record<string, unknown>, cookie = owner) {
  return call(cookie, { method: 'POST', body: { provider: X, clientSecret: SECRET, ...body } });
}

async function connectingAs(): Promise<string | undefined> {
  starts.length = 0;
  const response = await start({ cookie: owner }, undefined, X);
  expect(response.status).toBe(200);
  return starts[0]?.app.clientSecret ?? starts[0]?.app.clientId;
}

async function provisionOther(): Promise<string> {
  const userId = await createTestUser(db, 'other-owner');
  return await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Other', 'Other', 'ws-other', 'Europe/Prague')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
}

function insertOtherApp(clientId: string, provider = X): Promise<string> {
  const id = randomUUID();
  return db.withTenant(otherWorkspace, SYSTEM, async (trx) => {
    await trx
      .insertInto('provider_apps')
      .values({
        id,
        provider,
        client_id: clientId,
        workspace_id: otherWorkspace,
        ...sealWorkspaceAppSecret(
          keyring,
          { id, provider, workspaceId: otherWorkspace },
          'CANARY_other',
        ),
      })
      .execute();
    return id;
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startConnect(test, { ...runtime, id: FAKE_PROVIDER }, [{ manifest, runtime }]);
  root = createDatabase({ connectionString: test.ownerUrl });
  otherWorkspace = await provisionOther();
});

afterAll(async () => {
  await root?.destroy();
  await stopConnect();
  await test?.stop();
});

describe('authorization', () => {
  it('lets only owners and admins manage apps, and never an API key', async () => {
    expect((await call(admin, { method: 'GET' })).status).toBe(200);
    for (const cookie of [editor, viewer]) {
      expect((await call(cookie, { method: 'GET' })).status).toBe(403);
      expect((await register({ clientId: 'abc' }, cookie)).status).toBe(403);
    }
    const keyed = await requestAs(app, { bearer: GRANT_TOKEN }, { method: 'GET', url: url() });
    expect(keyed.status).toBe(401);
  });
});

describe('register', () => {
  it('refuses providers without workspace apps and malformed client ids', async () => {
    const unsupported = await register({ provider: FAKE_PROVIDER, clientId: 'abc' });
    expect(unsupported.status).toBe(422);
    expect(unsupported.json.error.details).toEqual([
      { path: 'body.provider', code: 'not_supported' },
    ]);
    const malformed = await register({ clientId: 'not a client id' });
    expect(malformed.status).toBe(422);
    expect(malformed.json.error.details).toEqual([{ path: 'body.clientId', code: 'invalid' }]);
  });

  it('refuses a client id another workspace holds without naming it', async () => {
    await insertOtherApp('other-client');
    const taken = await register({ clientId: 'other-client' });
    expect(taken.status).toBe(409);
    expect(taken.json.error.details).toEqual([{ path: 'body.clientId', code: 'client_id_taken' }]);
    expect(JSON.stringify(taken.json)).not.toContain(otherWorkspace);
  });
});

describe('connect start', () => {
  it('prefers the workspace app, falls back to the instance app, and fails with neither', async () => {
    const none = await start({ cookie: owner }, undefined, X);
    expect(none.status).toBe(422);

    await registerApp(X);
    expect(await connectingAs()).toBe(`${X}-client`);

    const created = await register({ clientId: 'own-client' });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ provider: X, clientId: 'own-client', status: 'active' });
    expect(await connectingAs()).toBe(SECRET);

    const second = await register({ clientId: 'own-client-2' });
    expect(second.status).toBe(409);
    expect(second.json.error.details).toEqual([
      { path: 'body.provider', code: 'workspace_app_exists' },
    ]);

    const replaced = await call(owner, {
      method: 'PUT',
      path: `/${X}/secret`,
      body: { clientSecret: NEW_SECRET },
    });
    expect(replaced.status).toBe(200);
    expect(await connectingAs()).toBe(NEW_SECRET);

    expect((await call(owner, { method: 'POST', path: `/${X}/disable` })).status).toBe(204);
    expect(await connectingAs()).toBe(`${X}-client`);
    expect((await call(owner, { method: 'POST', path: `/${X}/disable` })).status).toBe(404);
  });

  it('fails a connect while the live workspace app is misconfigured, never using the instance app', async () => {
    const created = await register({ clientId: 'own-client-3' });
    expect(created.status).toBe(201);
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      trx
        .updateTable('provider_apps')
        .set({ status: 'misconfigured' })
        .where('workspace_id', '=', workspaceId)
        .where('client_id', '=', 'own-client-3')
        .execute(),
    );
    starts.length = 0;
    const refused = await start({ cookie: owner }, undefined, X);
    expect(refused.status).toBe(422);
    expect(((await refused.json()) as { error: { details: unknown } }).error.details).toEqual([
      { path: 'body.provider', code: 'app_config' },
    ]);
    expect(starts).toEqual([]);
    expect((await call(owner, { method: 'POST', path: `/${X}/disable` })).status).toBe(204);
  });

  it('reactivates a disabled app when the workspace registers its client id again', async () => {
    const revived = await register({ clientId: 'own-client', clientSecret: REVIVED_SECRET });
    expect(revived.status).toBe(201);
    expect(revived.json).toMatchObject({ clientId: 'own-client', status: 'active' });
    expect(await connectingAs()).toBe(REVIVED_SECRET);
    expect((await register({ clientId: 'own-client-3' })).status).toBe(409);

    const listed = await call(owner, { method: 'GET' });
    expect(
      listed.json.items.map((item: { clientId: string; status: string }) => [
        item.clientId,
        item.status,
      ]),
    ).toEqual([
      ['own-client-3', 'disabled'],
      ['own-client', 'active'],
    ]);
  });

  it('audits register, replace and disable with the client id and never the secret', async () => {
    const rows = await asOwner((trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'args_summary'])
        .where('resource_kind', '=', 'provider_app')
        .orderBy('occurred_at')
        .execute(),
    );
    expect(
      rows.map((row) => [row.action, (row.args_summary as { client_id: string }).client_id]),
    ).toEqual([
      ['provider_app.registered', 'own-client'],
      ['provider_app.secret_replaced', 'own-client'],
      ['provider_app.disabled', 'own-client'],
      ['provider_app.registered', 'own-client-3'],
      ['provider_app.disabled', 'own-client-3'],
      ['provider_app.registered', 'own-client'],
    ]);
    expect(JSON.stringify(rows)).not.toContain('CANARY');
  });
});

describe('tenancy', () => {
  it("never loads another workspace's app, and a moved row cannot be opened", async () => {
    const theirs = await insertOtherApp('other-client-2', 'youtube');
    const loaded = await asOwner((trx) =>
      loadProviderApp(trx, keyring, { id: theirs }, { publicBaseUrl: PUBLIC }),
    );
    expect(loaded).toBeNull();
    const listed = await call(owner, { method: 'GET' });
    expect(JSON.stringify(listed.json)).not.toContain('other-client');

    await root.withActor({ kind: 'cli' }, (trx) =>
      trx
        .updateTable('provider_apps')
        .set({ workspace_id: workspaceId })
        .where('id', '=', theirs)
        .execute(),
    );
    await expect(
      asOwner((trx) => loadProviderApp(trx, keyring, { id: theirs }, { publicBaseUrl: PUBLIC })),
    ).rejects.toThrow();
  });

  it('flags a workspace app without an instance incident', async () => {
    const created = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const id = randomUUID();
      await trx
        .insertInto('provider_apps')
        .values({
          id,
          provider: 'pinterest',
          client_id: 'pin-workspace',
          workspace_id: workspaceId,
        })
        .execute();
      await flagApp(trx, workspaceId, id, 'invalid_client');
      return id;
    });
    const state = await db.withTenant(workspaceId, SYSTEM, async (trx) => ({
      status: (
        await trx
          .selectFrom('provider_apps')
          .select('status')
          .where('id', '=', created)
          .executeTakeFirstOrThrow()
      ).status,
      incidents: await trx
        .selectFrom('provider_app_incidents')
        .select('id')
        .where('provider_app_id', '=', created)
        .execute(),
    }));
    expect(state).toEqual({ status: 'misconfigured', incidents: [] });
    const event = await root.withActor({ kind: 'cli' }, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('dedupe_key')
        .where('subject_id', '=', created)
        .executeTakeFirstOrThrow(),
    );
    expect(event.dedupe_key).toMatch(
      new RegExp(`^provider_app\\.misconfigured\\.${created}\\.\\d{4}-\\d{2}-\\d{2}T`),
    );
  });
});

describe('CLI register', () => {
  it('ignores workspace apps and refuses only on an active instance app', async () => {
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      trx
        .insertInto('provider_apps')
        .values({ provider: 'linkedin', client_id: 'liworkspace', workspace_id: workspaceId })
        .execute(),
    );
    const id = await registerSecretApp(keyDeps(), 'linkedin', 'liinstance', 'CANARY_cli_secret');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(
      registerSecretApp(keyDeps(), 'linkedin', 'liinstance2', 'CANARY_cli_secret'),
    ).rejects.toThrow();
  });
});

describe('SEC-01', () => {
  it('keeps every client secret out of logs and webhook events', async () => {
    const events = await root.withActor({ kind: 'cli' }, (trx) =>
      sql<{ row: unknown }>`select to_jsonb(e) as row from webhook_events e`.execute(trx),
    );
    const changes = lines.filter((line) => line.includes('workspace provider app changed'));
    expect(changes.length).toBeGreaterThanOrEqual(6);
    expect(events.rows.length).toBeGreaterThan(0);
    expect(lines.join('\n')).not.toContain('CANARY');
    expect(JSON.stringify(events.rows)).not.toContain('CANARY');
  });
});
