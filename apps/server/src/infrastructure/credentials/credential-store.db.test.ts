import { randomBytes, randomUUID } from 'node:crypto';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  loadCredential,
  loadProviderApp,
  saveCredential,
  sealAppSecret,
} from './credential-store.ts';

interface Tenant {
  userId: string;
  workspaceId: string;
}

const SYSTEM: Actor = { kind: 'system' };
const PUBLIC = 'https://media.example.test';

let test: TestDatabase;
let db: Database;
let operator: Database;
let keyring: Keyring;
let appId: string;
let a: Tenant;
let b: Tenant;

async function provision(label: string): Promise<Tenant> {
  const userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                              ${`User ${label}`}, 'hash', 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  const workspaceId = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id
        from provision_organization(${`Org ${label}`}, ${`Workspace ${label}`}, ${`ws-${label}`}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  return { userId, workspaceId };
}

async function connectAccount(tenant: Tenant): Promise<string> {
  return await db.withTenant(tenant.workspaceId, { kind: 'user', id: tenant.userId }, (trx) =>
    trx
      .insertInto('social_accounts')
      .values({
        workspace_id: tenant.workspaceId,
        provider: 'bluesky',
        provider_app_id: appId,
        provider_account_id: `did:plc:${tenant.workspaceId.slice(0, 8)}`,
        account_kind: 'profile',
        display_name: 'Account',
      })
      .returning('id')
      .executeTakeFirstOrThrow()
      .then((row) => row.id),
  );
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  operator = createDatabase({ connectionString: test.operatorUrl });
  keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  appId = randomUUID();
  await operator.withActor({ kind: 'cli' }, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({
        id: appId,
        provider: 'bluesky',
        client_id: 'client-1',
        ...sealAppSecret(keyring, appId, 'bluesky', 'shh-app-secret'),
      })
      .execute(),
  );
  a = await provision('a');
  b = await provision('b');
});

afterAll(async () => {
  await db?.destroy();
  await operator?.destroy();
  await test?.stop();
});

describe('provider apps', () => {
  it('opens the operator-sealed client secret', async () => {
    const loaded = await db.withActor(SYSTEM, (trx) =>
      loadProviderApp(
        trx,
        keyring,
        { provider: 'bluesky', instanceHost: '' },
        { publicBaseUrl: PUBLIC },
      ),
    );
    expect(loaded?.id).toBe(appId);
    expect(loaded?.app).toEqual({
      clientId: 'client-1',
      clientSecret: 'shh-app-secret',
      publicBaseUrl: PUBLIC,
    });
    const byId = await db.withActor(SYSTEM, (trx) =>
      loadProviderApp(trx, keyring, { id: appId }, { publicBaseUrl: PUBLIC }),
    );
    expect(byId?.app.clientSecret).toBe('shh-app-secret');
  });
});

describe('account credentials', () => {
  it('round-trips, keeps the id across updates and bumps the version', async () => {
    const accountId = await connectAccount(a);
    const actor: Actor = { kind: 'user', id: a.userId };
    const first = await db.withTenant(a.workspaceId, actor, (trx) =>
      saveCredential(trx, keyring, {
        workspaceId: a.workspaceId,
        socialAccountId: accountId,
        kind: 'oauth',
        value: { accessToken: 'at-1', refreshToken: 'rt-1' },
        grantedScopes: ['atproto'],
        accessExpiresAt: Temporal.Instant.from('2026-10-21T13:00:00Z'),
      }),
    );
    const second = await db.withTenant(a.workspaceId, actor, (trx) =>
      saveCredential(trx, keyring, {
        workspaceId: a.workspaceId,
        socialAccountId: accountId,
        kind: 'oauth',
        value: { accessToken: 'at-2', refreshToken: 'rt-2' },
        grantedScopes: ['atproto'],
      }),
    );
    expect(second).toEqual({ id: first.id, version: first.version + 1 });

    const loaded = await db.withTenant(a.workspaceId, actor, (trx) =>
      loadCredential(trx, keyring, {
        workspaceId: a.workspaceId,
        socialAccountId: accountId,
        kind: 'oauth',
      }),
    );
    expect(loaded?.value).toEqual({ accessToken: 'at-2', refreshToken: 'rt-2' });
    expect(loaded?.provider).toBe('bluesky');
    expect(loaded?.accessExpiresAt).toBeNull();

    const raw = await db.withTenant(a.workspaceId, actor, (trx) =>
      trx
        .selectFrom('account_credentials')
        .select('ciphertext')
        .where('id', '=', first.id)
        .executeTakeFirstOrThrow(),
    );
    expect(raw.ciphertext.toString('utf8')).not.toContain('at-2');
  });

  it('cannot open a row moved to another workspace', async () => {
    const accountA = await db.withTenant(a.workspaceId, { kind: 'user', id: a.userId }, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select('id')
        .executeTakeFirstOrThrow()
        .then((r) => r.id),
    );
    const accountB = await connectAccount(b);
    const sealed = await db.withTenant(a.workspaceId, { kind: 'user', id: a.userId }, (trx) =>
      trx
        .selectFrom('account_credentials')
        .select(['id', 'ciphertext', 'nonce', 'wrapped_dek', 'kek_version'])
        .where('social_account_id', '=', accountA)
        .executeTakeFirstOrThrow(),
    );
    await db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
      trx
        .insertInto('account_credentials')
        .values({
          ...sealed,
          workspace_id: b.workspaceId,
          social_account_id: accountB,
          kind: 'oauth',
        })
        .execute(),
    );
    await expect(
      db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
        loadCredential(trx, keyring, {
          workspaceId: b.workspaceId,
          socialAccountId: accountB,
          kind: 'oauth',
        }),
      ),
    ).rejects.toThrow();
  });

  it('is invisible to another tenant', async () => {
    const accountA = await db.withTenant(a.workspaceId, { kind: 'user', id: a.userId }, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select('id')
        .executeTakeFirstOrThrow()
        .then((r) => r.id),
    );
    const leaked = await db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
      loadCredential(trx, keyring, {
        workspaceId: a.workspaceId,
        socialAccountId: accountA,
        kind: 'oauth',
      }),
    );
    expect(leaked).toBeNull();
  });
});
