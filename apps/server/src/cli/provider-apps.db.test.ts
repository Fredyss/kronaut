import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createKeyring } from '@kronaut/credentials';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { CompactSign, compactVerify, importJWK } from 'jose';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadProviderApp } from '../credential-store.ts';
import { type PublishFixture, startPublishFixture } from '../publish/testing.ts';
import { loadSigningKeys } from '../signing-keys.ts';

const execFileAsync = promisify(execFile);
const SYSTEM: Actor = { kind: 'system' };
const CLI_PATH = join(import.meta.dirname, '..', 'cli.ts');
const PUBLIC_URL = 'https://kronaut.example.test';

let test: TestDatabase;
let fixture: PublishFixture;
let kek: Buffer;
const output: string[] = [];

interface CliResult {
  readonly code: number;
  readonly stdout: string;
}

async function cli(...args: string[]): Promise<CliResult> {
  return await cliWithStdin(undefined, ...args);
}

async function cliWithStdin(stdin: string | undefined, ...args: string[]): Promise<CliResult> {
  const env = {
    PATH: process.env.PATH ?? '',
    KRONAUT_OPERATOR_DATABASE_URL: test.operatorUrl,
    KRONAUT_PUBLIC_URL: PUBLIC_URL,
    KRONAUT_KEK_1: kek.toString('base64url'),
  };
  try {
    const running = execFileAsync(process.execPath, [CLI_PATH, ...args], { env });
    if (stdin !== undefined) running.child.stdin?.end(stdin);
    const { stdout, stderr } = await running;
    output.push(stdout, stderr);
    return { code: 0, stdout: stdout.trim() };
  } catch (err) {
    const failed = err as { code?: number; stdout?: string; stderr?: string };
    output.push(failed.stdout ?? '', failed.stderr ?? '');
    return { code: failed.code ?? -1, stdout: (failed.stdout ?? '').trim() };
  }
}

async function ok(...args: string[]): Promise<string> {
  const result = await cli(...args);
  expect(result.code, args.join(' ')).toBe(0);
  return result.stdout;
}

function keys(appId: string) {
  return fixture.db.withActor(SYSTEM, (trx) => loadSigningKeys(trx, fixture.keyring, appId));
}

function keyRow(appId: string, kid: string) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('provider_app_keys')
      .select(['id', 'status', 'public_jwk'])
      .where('provider_app_id', '=', appId)
      .where('kid', '=', kid)
      .executeTakeFirst(),
  );
}

beforeAll(async () => {
  test = await startTestDatabase();
  kek = randomBytes(32);
  fixture = await startPublishFixture(test, 'ws-keys', createKeyring(new Map([[1, kek]])));
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

describe('provider app keys CLI', () => {
  it('creates and activates a key whose private half signs for the published public half', async () => {
    const appId = await ok('provider-app', 'register', 'bluesky');
    expect((await cli('provider-app', 'register', 'bluesky')).code).toBe(1);
    const app = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('provider_apps')
        .select(['provider', 'instance_host', 'client_id', 'client_secret_ciphertext'])
        .where('id', '=', appId)
        .executeTakeFirstOrThrow(),
    );
    expect(app).toEqual({
      provider: 'bluesky',
      instance_host: '',
      client_id: `${PUBLIC_URL}/oauth/bluesky/oauth-client-metadata.json`,
      client_secret_ciphertext: null,
    });

    const kid = await ok('provider-app', 'key', 'create', appId);
    await ok('provider-app', 'key', 'activate', appId, kid);

    const loaded = await keys(appId);
    const active = loaded.active;
    if (active === null) throw new Error('no active key');
    expect(active.kid).toBe(kid);
    const [published] = loaded.published;
    if (published === undefined) throw new Error('no published key');
    expect(published).not.toHaveProperty('d');
    expect(published).toMatchObject({ kty: 'EC', crv: 'P-256', kid, alg: 'ES256', use: 'sig' });
    const jws = await new CompactSign(new TextEncoder().encode('assertion'))
      .setProtectedHeader({ alg: 'ES256', kid })
      .sign(await importJWK(active.privateJwk, 'ES256'));
    const verified = await compactVerify(jws, await importJWK(published, 'ES256'));
    expect(new TextDecoder().decode(verified.payload)).toBe('assertion');
  });

  it('refuses to delete a key while a credential is bound to it', async () => {
    const appId = await fixture.createApp('fake-delete');
    const oldKid = await ok('provider-app', 'key', 'create', appId);
    await ok('provider-app', 'key', 'activate', appId, oldKid);
    const old = await keyRow(appId, oldKid);
    const accountId = await fixture.connectAccount(appId, { clientKeyId: old?.id ?? '' });
    const newKid = await ok('provider-app', 'key', 'create', appId);
    await ok('provider-app', 'key', 'activate', appId, newKid);
    expect(await keyRow(appId, oldKid)).toMatchObject({ status: 'retiring' });

    const tooSoon = await cli('provider-app', 'key', 'delete', appId, oldKid);
    expect(tooSoon.code).toBe(1);
    expect(output.at(-1)).toContain('retired less than 10 minutes ago');
    await fixture.owner.withActor(SYSTEM, async (trx) => {
      await sql`set local session_replication_role = replica`.execute(trx);
      await trx
        .updateTable('provider_app_keys')
        .set({ updated_at: sql<Date>`now() - interval '11 minutes'` })
        .where('kid', '=', oldKid)
        .execute();
    });

    const refused = await cli('provider-app', 'key', 'delete', appId, oldKid);
    expect(refused.code).toBe(1);
    expect(output.at(-1)).toContain('still signs for connected credentials');
    expect(await keyRow(appId, oldKid)).toMatchObject({ status: 'retiring' });

    await fixture.owner.withActor(SYSTEM, (trx) =>
      trx.deleteFrom('account_credentials').where('social_account_id', '=', accountId).execute(),
    );
    await ok('provider-app', 'key', 'delete', appId, oldKid);
    expect(await keyRow(appId, oldKid)).toBeUndefined();
  });

  it('never prints, logs or publishes the private key', async () => {
    const appId = await fixture.createApp('fake-secret');
    const kids = [
      await ok('provider-app', 'key', 'create', appId),
      await ok('provider-app', 'key', 'create', appId),
    ];
    for (const kid of kids) await ok('provider-app', 'key', 'activate', appId, kid);
    const listing = await ok('provider-app', 'key', 'list', appId);
    expect(listing.split('\n').map((line) => line.split('\t').slice(0, 2))).toEqual([
      [kids[0], 'retiring'],
      [kids[1], 'active'],
    ]);

    const rows = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('provider_app_keys')
        .select(['id', 'public_jwk'])
        .where('provider_app_id', '=', appId)
        .execute(),
    );
    const loaded = await keys(appId);
    expect(output.join('').length).toBeGreaterThan(0);
    for (const row of rows) {
      const d = loaded.byId(row.id)?.privateJwk.d;
      expect(typeof d).toBe('string');
      for (const haystack of [JSON.stringify(row.public_jwk), ...output]) {
        expect(haystack).not.toContain(d);
      }
    }
  });

  it.each([
    ['facebook', '1234567890123456', 'a facebook app is already registered'],
    ['instagram', '990011223344', 'an instagram app is already registered'],
    ['linkedin', '86abcdef123xyz', 'a linkedin app is already registered'],
    ['threads', '1122334455667788', 'a threads app is already registered'],
  ])(
    'registers %s with its secret sealed from stdin, never echoed',
    async (provider, clientId, refusal) => {
      const secret = `${provider}-secret-${randomBytes(12).toString('hex')}`;
      const before = output.length;
      const register = ['provider-app', 'register', provider, '--client-id', clientId];
      const first = await cliWithStdin(`${secret}\n`, ...register);
      expect(first.code).toBe(0);
      const appId = first.stdout;
      expect((await cliWithStdin(secret, ...register)).code).toBe(1);
      expect(output.at(-1)).toContain(refusal);

      const row = await fixture.owner.withActor(SYSTEM, (trx) =>
        trx
          .selectFrom('provider_apps')
          .select(['provider', 'instance_host', 'client_id', 'client_secret_ciphertext'])
          .where('id', '=', appId)
          .executeTakeFirstOrThrow(),
      );
      expect(row).toMatchObject({ provider, instance_host: '', client_id: clientId });
      expect(row.client_secret_ciphertext?.toString('utf8')).not.toContain(secret);
      const loaded = await fixture.db.withActor(SYSTEM, (trx) =>
        loadProviderApp(trx, fixture.keyring, { id: appId }, { publicBaseUrl: PUBLIC_URL }),
      );
      expect(loaded?.app.clientSecret).toBe(secret);
      const printed = output.slice(before);
      expect(printed.join('').length).toBeGreaterThan(0);
      for (const text of printed) expect(text).not.toContain(secret);
    },
  );
});
