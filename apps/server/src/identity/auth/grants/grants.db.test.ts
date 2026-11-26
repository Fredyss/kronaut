import { randomUUID } from 'node:crypto';
import {
  decodePublicId,
  encodePublicId,
  GRANTABLE_SCOPES,
  NEVER_GRANTABLE_ACTIONS,
} from '@kronaut/core';
import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BASE,
  createTestInstance,
  createTestUser,
  expectError,
  insertTestGrant,
  loginAs,
  provisionTestWorkspace,
  randomGrantToken,
  requestAs,
} from '../../../base/http/testing.ts';
import { hashGrantToken } from '../grant.ts';

interface Grant {
  readonly id: string;
  readonly status: string;
  readonly scopes: string[];
  readonly resourceScope: string;
  readonly access: { readonly brandIds: string[] } | null;
  readonly tokenPrefix: string | null;
  readonly token?: string;
}

const CLI = { kind: 'cli' } as const;
const TOKEN = /^kro_([0-9a-f]{16})_[A-Za-z0-9_-]{43}$/;

let test: TestDatabase;
let root: Database;
let db: Database;
let app: Hono;
let grantKey: Uint8Array;
let workspaceId: string;
let otherWorkspace: string;
let ownerId: string;
const cookies: Record<string, string> = {};

function internal(grantId: string): string {
  return decodePublicId('grant', grantId) ?? '';
}

function url(ws: string, path = ''): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', ws)}/grants${path}`;
}

async function createAs(label: string, body: Record<string, unknown>, ws = workspaceId) {
  const response = await requestAs(
    app,
    { cookie: cookies[label] ?? '' },
    { method: 'POST', url: url(ws), body: { name: 'Agent', scopes: ['posts:read'], ...body } },
  );
  return response;
}

async function created(body: Record<string, unknown> = {}): Promise<Grant & { token: string }> {
  const response = await createAs('owner', body);
  expect(response.status).toBe(201);
  return (await response.json()) as Grant & { token: string };
}

function revokeAs(label: string, grantId: string, ws = workspaceId) {
  return requestAs(
    app,
    { cookie: cookies[label] ?? '' },
    { method: 'POST', url: url(ws, `/${grantId}/revoke`) },
  );
}

async function listAs(label: string, ws = workspaceId) {
  return await requestAs(app, { cookie: cookies[label] ?? '' }, { method: 'GET', url: url(ws) });
}

function brandsWith(token: string, ws = workspaceId) {
  const brands = `${BASE}/v1/workspaces/${encodePublicId('workspace', ws)}/brands`;
  return requestAs(app, { bearer: token }, { method: 'GET', url: brands });
}

async function member(label: string, role: string, restricted = false): Promise<void> {
  const id = await createTestUser(db, label);
  await root.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({
        workspace_id: workspaceId,
        user_id: id,
        role,
        resource_scope: restricted ? 'restricted' : 'workspace',
      })
      .execute(),
  );
  cookies[label] = (await loginAs(app, label)).cookie;
}

async function insertBrand(ws: string, userId: string): Promise<string> {
  const id = await db.withTenant(ws, { kind: 'user', id: userId }, async (trx) => {
    const row = await trx
      .insertInto('brands')
      .values({ workspace_id: ws, name: 'Brand', slug: `brand-${randomUUID().slice(0, 8)}` })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
  return encodePublicId('brand', id);
}

beforeAll(async () => {
  test = await startTestDatabase();
  root = createDatabase({ connectionString: test.ownerUrl });
  db = createDatabase({ connectionString: test.appUrl });
  const instance = createTestInstance({ db });
  app = instance.app;
  grantKey = instance.deps.keys.grant;
  ownerId = await createTestUser(db, 'owner');
  workspaceId = await provisionTestWorkspace(db, ownerId, 'ws-grants');
  cookies.owner = (await loginAs(app, 'owner')).cookie;
  await member('admin', 'admin');
  await member('editor', 'editor');
  await member('viewer', 'viewer');
  await member('scoped-admin', 'admin', true);
  const otherId = await createTestUser(db, 'other');
  otherWorkspace = await provisionTestWorkspace(db, otherId, 'ws-grants-other');
  cookies.other = (await loginAs(app, 'other')).cookie;
});

afterAll(async () => {
  await root?.destroy();
  await db?.destroy();
  await test?.stop();
});

describe('who manages API keys', () => {
  it('lets owners and admins create, list and revoke', async () => {
    for (const label of ['owner', 'admin']) {
      const response = await createAs(label, { name: `Key of ${label}` });
      expect(response.status).toBe(201);
      const { id } = (await response.json()) as Grant;
      expect((await listAs(label)).status).toBe(200);
      expect((await revokeAs(label, id)).status).toBe(204);
    }
  });

  it('refuses other roles and restricted admins (AUTHZ-01)', async () => {
    const { id } = await created();
    for (const label of ['editor', 'viewer', 'scoped-admin']) {
      await expectError(await createAs(label, {}), 403, 'forbidden');
      await expectError(await listAs(label), 403, 'forbidden');
      await expectError(await revokeAs(label, id), 403, 'forbidden');
    }
  });

  it('never lets an API key manage keys, whatever its scopes (AUTHZ-02)', async () => {
    const token = randomGrantToken();
    await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, (trx) =>
      insertTestGrant(trx, grantKey, token, {
        workspaceId,
        sponsorUserId: ownerId,
        scopes: GRANTABLE_SCOPES,
      }),
    );
    const { id } = await created();
    const keyed = { bearer: token };
    const body = { name: 'Escalated', scopes: ['posts:read'] };
    expect((await requestAs(app, keyed, { method: 'GET', url: url(workspaceId) })).status).toBe(
      401,
    );
    const create = await requestAs(app, keyed, { method: 'POST', url: url(workspaceId), body });
    expect(create.status).toBe(401);
    const revoke = await requestAs(app, keyed, {
      method: 'POST',
      url: url(workspaceId, `/${id}/revoke`),
    });
    expect(revoke.status).toBe(401);
  });
});

describe('create', () => {
  it('shows the token once and stores only its HMAC (SEC-05)', async () => {
    const grant = await created({ name: 'Once', scopes: ['brands:read', 'posts:read'] });
    const match = TOKEN.exec(grant.token);
    expect(match).not.toBeNull();
    expect(grant.tokenPrefix).toBe(`kro_${match?.[1]}`);
    expect(grant.scopes).toEqual(['brands:read', 'posts:read']);
    const secret = grant.token.slice(grant.tokenPrefix?.length ?? 0);
    const listed = await (await listAs('owner')).text();
    expect(listed).toContain(grant.id);
    expect(listed).not.toContain(secret);

    const stored = await root.withActor(CLI, async (trx) => ({
      tokens: await trx.selectFrom('grant_tokens').selectAll().execute(),
      grants: await trx.selectFrom('access_grants').selectAll().execute(),
      audit: await trx.selectFrom('audit_events').selectAll().execute(),
      idempotency: await trx.selectFrom('idempotency_keys').selectAll().execute(),
    }));
    const token = stored.tokens.find((row) => row.key_id === match?.[1]);
    expect(token?.token_hash).toEqual(hashGrantToken(grantKey, grant.token));
    expect(JSON.stringify(stored)).not.toContain(secret);
    const event = stored.audit.find((row) => row.action === 'grant.created');
    expect(JSON.stringify(event?.args_summary)).not.toContain('Once');

    expect((await brandsWith(grant.token)).status).toBe(200);
  });

  it('refuses scopes that can never be granted, and unknown ones', async () => {
    for (const scope of NEVER_GRANTABLE_ACTIONS) {
      const error = await expectError(
        await createAs('owner', { scopes: ['posts:read', scope] }),
        422,
        'unprocessable',
      );
      expect(error.details).toEqual([{ path: 'body.scopes', code: 'never_grantable' }]);
    }
    const unknown = await expectError(
      await createAs('owner', { scopes: ['posts:write'] }),
      422,
      'unprocessable',
    );
    expect(unknown.details).toEqual([{ path: 'body.scopes', code: 'unknown_scope' }]);
  });

  it('keeps the database CHECK as the last line for scopes (AUTHZ-02)', async () => {
    const insert = db.withTenant(workspaceId, { kind: 'user', id: ownerId }, (trx) =>
      trx
        .insertInto('access_grants')
        .values({
          workspace_id: workspaceId,
          kind: 'api_key',
          name: 'Direct',
          sponsor_user_id: ownerId,
          scopes: ['posts:read', 'approvals:decide'],
        })
        .execute(),
    );
    await expect(insert).rejects.toMatchObject({ constraint: 'ck_access_grants_scopes' });
  });

  it('refuses a past expiry and access lists on a workspace-wide key', async () => {
    const past = await createAs('owner', { expiresAt: '2020-01-01T00:00:00Z' });
    expect((await expectError(past, 422, 'unprocessable')).details?.[0]?.code).toBe('in_past');
    const brandId = await insertBrand(workspaceId, ownerId);
    const wide = await createAs('owner', {
      access: { brandIds: [brandId], locationIds: [], accountIds: [] },
    });
    expect((await expectError(wide, 422, 'unprocessable')).details?.[0]?.code).toBe(
      'not_restricted',
    );
  });

  it('restricts a key to the listed brands of its own workspace only (AUTHZ-03)', async () => {
    const brandId = await insertBrand(workspaceId, ownerId);
    const grant = await created({ resourceScope: 'restricted', access: { brandIds: [brandId] } });
    expect(grant.resourceScope).toBe('restricted');
    expect(grant.access?.brandIds).toEqual([brandId]);
    const otherId = await root.withActor(CLI, async (trx) => {
      const row = await trx
        .selectFrom('memberships')
        .select('user_id')
        .where('workspace_id', '=', otherWorkspace)
        .executeTakeFirstOrThrow();
      return row.user_id;
    });
    const foreign = await insertBrand(otherWorkspace, otherId);
    const response = await createAs('owner', {
      resourceScope: 'restricted',
      access: { brandIds: [foreign] },
    });
    expect((await expectError(response, 422, 'unprocessable')).details).toEqual([
      { path: 'body.access.brandIds', code: 'not_found' },
    ]);
  });
});

describe('revoke', () => {
  it('stops the key on the next request and audits once (AUTHZ-04)', async () => {
    const grant = await created({ scopes: ['brands:read'] });
    expect((await brandsWith(grant.token)).status).toBe(200);
    expect((await revokeAs('owner', grant.id)).status).toBe(204);
    await expectError(await brandsWith(grant.token), 401, 'unauthenticated');
    expect((await revokeAs('owner', grant.id)).status).toBe(204);

    const listed = (await (await listAs('owner')).json()) as { items: Grant[] };
    expect(listed.items.find((item) => item.id === grant.id)?.status).toBe('revoked');
    const stored = await root.withActor(CLI, async (trx) => ({
      events: await trx
        .selectFrom('audit_events')
        .select('id')
        .where('action', '=', 'grant.revoked')
        .where('resource_id', '=', internal(grant.id))
        .execute(),
      live: await trx
        .selectFrom('grant_tokens')
        .select('id')
        .where('grant_id', '=', internal(grant.id))
        .where('revoked_at', 'is', null)
        .execute(),
    }));
    expect(stored.events).toHaveLength(1);
    expect(stored.live).toEqual([]);
  });

  it('lets an expired key fail authentication and lists it as expired', async () => {
    const grant = await created({
      scopes: ['brands:read'],
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect((await brandsWith(grant.token)).status).toBe(200);
    await root.withActor(CLI, (trx) =>
      trx
        .updateTable('access_grants')
        .set({ expires_at: sql`now() - interval '1 second'` })
        .where('id', '=', internal(grant.id))
        .execute(),
    );
    await expectError(await brandsWith(grant.token), 401, 'unauthenticated');
    const listed = (await (await listAs('owner')).json()) as { items: Grant[] };
    expect(listed.items.find((item) => item.id === grant.id)?.status).toBe('expired');
  });
});

describe('workspace isolation (TEN-01)', () => {
  it("hides one workspace's keys from another workspace's owner", async () => {
    const grant = await created({ scopes: ['brands:read'] });
    expect((await listAs('other')).status).toBe(404);
    expect((await revokeAs('other', grant.id)).status).toBe(404);
    expect((await revokeAs('other', grant.id, otherWorkspace)).status).toBe(404);
    expect((await brandsWith(grant.token)).status).toBe(200);
    expect((await brandsWith(grant.token, otherWorkspace)).status).toBe(404);
    const theirs = (await (await listAs('other', otherWorkspace)).json()) as { items: Grant[] };
    expect(theirs.items).toEqual([]);
  });
});
