import { createHmac, randomBytes } from 'node:crypto';
import { createKeyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerSecretApp } from '../cli/provider-apps.ts';
import { accessExempt, createHttpApp, deriveHttpKeys } from '../http/kernel.ts';
import { installJobQueue } from '../job-queue.ts';
import { runMetaLifecycle } from './lifecycle.ts';
import { META_BODY_LIMITS, metaRoutes } from './routes.ts';

const BASE = 'https://kronaut.example.test';
const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };
const FB_SECRET = 'CANARY_facebook_app_secret';
const IG_SECRET = 'CANARY_instagram_app_secret';
const TH_SECRET = 'CANARY_threads_app_secret';
const USER_ID = '10203040506070809';
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

let test: TestDatabase;
let db: Database;
let root: Database;
let operator: Database;
let app: Hono;
const lines: string[] = [];
const workspaces: string[] = [];
const accounts: Record<string, string> = {};

function sign(payload: unknown, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256', secret).update(encoded).digest('base64url')}.${encoded}`;
}

function payload(extra: Record<string, unknown> = {}) {
  return { algorithm: 'HMAC-SHA256', issued_at: 1_798_000_000, user_id: USER_ID, ...extra };
}

function post(path: string, body: string, headers: Record<string, string> = FORM) {
  return app.request(`${BASE}/v1/meta/${path}`, { method: 'POST', headers, body });
}

function callback(path: string, signedRequest: string) {
  return post(path, new URLSearchParams({ signed_request: signedRequest }).toString());
}

async function status(code: string, language?: string): Promise<string> {
  const headers: Record<string, string> =
    language === undefined ? {} : { 'accept-language': language };
  const response = await app.request(`${BASE}/v1/meta/deletion/${code}`, { headers });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  return await response.text();
}

async function requestRow(provider: string, kind: string) {
  return await root.withActor(CLI, (trx) =>
    trx
      .selectFrom('meta_lifecycle_requests')
      .select(['id', 'subject_id', 'matched', 'completed_at'])
      .where('provider', '=', provider)
      .where('kind', '=', kind)
      .executeTakeFirstOrThrow(),
  );
}

async function account(label: string) {
  return await root.withActor(CLI, async (trx) => {
    const row = await trx
      .selectFrom('social_accounts')
      .select([
        'status',
        'status_reason',
        'display_name',
        'handle',
        'profile_url',
        'provider_subject_id',
      ])
      .where('id', '=', accounts[label] ?? '')
      .executeTakeFirstOrThrow();
    const { n } = await trx
      .selectFrom('account_credentials')
      .select(sql<number>`count(*)::integer`.as('n'))
      .where('social_account_id', '=', accounts[label] ?? '')
      .executeTakeFirstOrThrow();
    return { ...row, credentials: n };
  });
}

async function provisionWorkspaces(): Promise<void> {
  const userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user('o@example.test', 'o@example.test', 'O', 'h', 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  for (const slug of ['meta-a', 'meta-b']) {
    const id = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
      const result = await sql<{ workspace_id: string }>`
        select workspace_id from provision_organization('Org', 'Workspace', ${slug}, 'UTC')
      `.execute(trx);
      return result.rows[0]?.workspace_id ?? '';
    });
    workspaces.push(id);
  }
}

interface Fixture {
  readonly label: string;
  readonly workspace: number;
  readonly provider: string;
  readonly appId: string;
  readonly accountId: string;
  readonly subjectId: string | null;
}

async function seedAccount(fixture: Fixture): Promise<void> {
  const workspaceId = workspaces[fixture.workspace] ?? '';
  await root.withActor(CLI, async (trx) => {
    const { id } = await trx
      .insertInto('social_accounts')
      .values({
        workspace_id: workspaceId,
        provider: fixture.provider,
        provider_app_id: fixture.appId,
        provider_account_id: fixture.accountId,
        provider_subject_id: fixture.subjectId,
        account_kind: 'page',
        handle: `${fixture.label}-handle`,
        display_name: `${fixture.label} name`,
        profile_url: `https://www.example.test/${fixture.label}`,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    accounts[fixture.label] = id;
    await trx
      .insertInto('account_credentials')
      .values({
        workspace_id: workspaceId,
        social_account_id: id,
        kind: 'page_token',
        ciphertext: Buffer.from('x'),
        nonce: Buffer.from('x'),
        wrapped_dek: Buffer.from('x'),
        kek_version: 1,
      })
      .execute();
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  root = createDatabase({ connectionString: test.ownerUrl });
  operator = createDatabase({ connectionString: test.operatorUrl });
  await installJobQueue(test.ownerUrl, root);
  const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });
  const commands = { db: operator, keyring, logger: pino({ level: 'silent' }) };
  const fb = await registerSecretApp(commands, 'facebook', 'fb-client', FB_SECRET);
  const ig = await registerSecretApp(commands, 'instagram', 'ig-client', IG_SECRET);
  const th = await registerSecretApp(commands, 'threads', 'th-client', TH_SECRET);
  await root.withActor(CLI, (trx) =>
    trx
      .updateTable('provider_apps')
      .set({ status: 'misconfigured' })
      .where('id', '=', th)
      .execute(),
  );
  const keys = deriveHttpKeys(randomBytes(32));
  const deps = { db, keyring, subjectKey: keys.metaSubject, publicBaseUrl: BASE };
  const http = { db, keys, logger, clock: () => Temporal.Now.instant(), publicBaseUrl: BASE };
  app = createHttpApp(
    { ...http, readiness: async () => true, routeBodyLimits: META_BODY_LIMITS },
    metaRoutes(deps),
  );
  await provisionWorkspaces();
  for (const fixture of [
    {
      label: 'fbA',
      workspace: 0,
      provider: 'facebook',
      appId: fb,
      accountId: '1',
      subjectId: USER_ID,
    },
    {
      label: 'fbB',
      workspace: 1,
      provider: 'facebook',
      appId: fb,
      accountId: '2',
      subjectId: USER_ID,
    },
    {
      label: 'other',
      workspace: 1,
      provider: 'facebook',
      appId: fb,
      accountId: '3',
      subjectId: '99',
    },
    {
      label: 'ig',
      workspace: 0,
      provider: 'instagram',
      appId: ig,
      accountId: USER_ID,
      subjectId: null,
    },
    {
      label: 'th',
      workspace: 1,
      provider: 'threads',
      appId: th,
      accountId: USER_ID,
      subjectId: null,
    },
  ]) {
    await seedAccount(fixture);
  }
});

afterAll(async () => {
  await Promise.all([db?.destroy(), root?.destroy(), operator?.destroy()]);
  await test?.stop();
});

describe('meta data deletion', () => {
  let code = '';

  it('answers a valid deletion request with a status url and a confirmation code', async () => {
    const response = await callback('facebook/deletion', sign(payload(), FB_SECRET));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string; confirmation_code: string };
    expect(body.confirmation_code).toMatch(/^[A-Z2-7]{20}$/);
    expect(body.url).toBe(`${BASE}/v1/meta/deletion/${body.confirmation_code}`);
    code = body.confirmation_code;
  });

  it('refuses a wrong secret, a bad algorithm, a malformed body or an unknown network', async () => {
    const refused = [
      await callback('facebook/deletion', sign(payload(), 'not-the-secret')),
      await callback('facebook/deletion', sign(payload(), IG_SECRET)),
      await callback('facebook/deletion', sign(payload({ algorithm: 'HMAC-SHA1' }), FB_SECRET)),
      await callback('facebook/deletion', sign(payload({ user_id: '' }), FB_SECRET)),
      await callback('facebook/deletion', 'no-dot-here'),
      await callback('facebook/deletion', `.${sign(payload(), FB_SECRET)}`),
    ];
    const bodies = await Promise.all(
      refused.map(async (response) => (await response.json()) as object),
    );
    expect(refused.map((response) => response.status)).toEqual(refused.map(() => 400));
    for (const body of bodies) {
      expect(body).toMatchObject({
        error: { code: 'invalid_request', message: 'The signed request is invalid.' },
      });
    }
    expect((await post('facebook/deletion', 'other=1')).status).toBe(400);
    expect((await post('facebook/deletion', '%FF', FORM)).status).toBe(400);
    expect(
      (await post('facebook/deletion', 'x', { 'content-type': 'application/json' })).status,
    ).toBe(415);
    expect((await callback('linkedin/deletion', sign(payload(), FB_SECRET))).status).toBe(404);
    const huge = await callback('facebook/deletion', 'a'.repeat(9 * 1024));
    expect(huge.status).toBe(413);
  });

  it('returns the same code for a replayed request', async () => {
    const replay = await callback('facebook/deletion', sign(payload(), FB_SECRET));
    expect(((await replay.json()) as { confirmation_code: string }).confirmation_code).toBe(code);
  });

  it('treats the same signed request on deauthorize as a separate request', async () => {
    const deauthorize = await callback('facebook/deauthorize', sign(payload(), FB_SECRET));
    expect(deauthorize.status).toBe(204);
  });

  it('wipes the matching channels in every workspace and reports it on the status page', async () => {
    expect(await status(code)).toBe('Kronaut received your request and is deleting your data.');
    const { id } = await requestRow('facebook', 'deletion');
    expect(await runMetaLifecycle(db, id)).toBe(2);
    expect(await runMetaLifecycle(db, id)).toBeNull();
    for (const label of ['fbA', 'fbB']) {
      expect(await account(label)).toEqual({
        status: 'disconnected',
        status_reason: 'data_deletion_requested',
        display_name: '',
        handle: null,
        profile_url: null,
        provider_subject_id: null,
        credentials: 0,
      });
    }
    expect(await account('other')).toMatchObject({
      status: 'active',
      display_name: 'other name',
      credentials: 1,
    });
    expect(await requestRow('facebook', 'deletion')).toMatchObject({
      subject_id: null,
      matched: 2,
    });
    const audits = await root.withActor(CLI, (trx) =>
      trx
        .selectFrom('audit_events')
        .select('resource_id')
        .where('action', '=', 'channel.data_deleted')
        .execute(),
    );
    expect(audits.map((row) => row.resource_id).sort()).toEqual(
      [accounts.fbA, accounts.fbB].sort(),
    );
    expect(await status(code)).toBe('Done. Kronaut deleted the data of 2 channels.');
    await root.withActor(CLI, (trx) =>
      trx
        .updateTable('meta_lifecycle_requests')
        .set({ completed_at: null, subject_id: USER_ID })
        .where('id', '=', id)
        .execute(),
    );
    expect(await runMetaLifecycle(db, id)).toBe(2);
    expect(await requestRow('facebook', 'deletion')).toMatchObject({ matched: 2 });
    expect(await status(code, 'de-AT, sk;q=0.8, cs;q=0.5')).toBe(
      'Hotovo. Kronaut vymazal údaje z 2 kanálov.',
    );
    expect(await status(code, 'cs-CZ')).toBe('Hotovo. Kronaut smazal údaje z 2 kanálů.');
    expect(await status('A'.repeat(20))).toBe('Unknown confirmation code.');
    expect(await status('not-a-code', 'sk')).toBe('Neznámy potvrdzovací kód.');
  });

  it('flags an Instagram channel matched by account id as revoked and deletes its credentials', async () => {
    const response = await callback('instagram/deauthorize', sign(payload(), IG_SECRET));
    expect(response.status).toBe(204);
    const { id } = await requestRow('instagram', 'deauthorize');
    expect(await runMetaLifecycle(db, id)).toBe(1);
    expect(await account('ig')).toMatchObject({
      status: 'needs_reauth',
      status_reason: 'auth_revoked',
      display_name: 'ig name',
      credentials: 0,
    });
    const incidents = await root.withActor(CLI, (trx) =>
      trx
        .selectFrom('channel_incidents')
        .select('kind')
        .where('social_account_id', '=', accounts.ig ?? '')
        .execute(),
    );
    expect(incidents).toEqual([{ kind: 'auth_revoked' }]);
  });

  it('accepts a misconfigured app and matches a Threads channel by account id', async () => {
    const response = await callback('threads/deletion', sign(payload(), TH_SECRET));
    expect(response.status).toBe(200);
    const { id } = await requestRow('threads', 'deletion');
    expect(await runMetaLifecycle(db, id)).toBe(1);
    expect(await account('th')).toMatchObject({
      status: 'disconnected',
      status_reason: 'data_deletion_requested',
      credentials: 0,
    });
  });

  it('never logs the signed request, the user id or a secret', () => {
    const logs = lines.join('\n');
    for (const secret of [USER_ID, FB_SECRET, IG_SECRET, TH_SECRET, sign(payload(), FB_SECRET)]) {
      expect(logs).not.toContain(secret);
    }
  });

  it('exempts exactly the Meta callbacks and the status page from Access', () => {
    for (const provider of ['facebook', 'instagram', 'threads']) {
      expect(accessExempt('POST', `/v1/meta/${provider}/deletion`)).toBe(true);
      expect(accessExempt('POST', `/v1/meta/${provider}/deauthorize`)).toBe(true);
    }
    expect(accessExempt('GET', `/v1/meta/deletion/${'A2'.repeat(10)}`)).toBe(true);
    for (const [method, path] of [
      ['GET', '/v1/meta/facebook/deletion'],
      ['POST', '/v1/meta/linkedin/deletion'],
      ['POST', '/v1/meta/facebook/deletion/'],
      ['POST', '/v1/meta/facebook/other'],
      ['POST', `/v1/meta/deletion/${'A'.repeat(20)}`],
      ['GET', `/v1/meta/deletion/${'a'.repeat(20)}`],
      ['GET', `/v1/meta/deletion/${'A'.repeat(21)}`],
      ['HEAD', `/v1/meta/deletion/${'A'.repeat(20)}`],
      ['POST', '/x/v1/meta/facebook/deletion'],
    ] as const) {
      expect(accessExempt(method, path), `${method} ${path}`).toBe(false);
    }
  });
});
