import { randomUUID } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { EgressRequest, EgressResponse, HttpClient } from '@kronaut/egress';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { refreshCapabilities } from '../channels/capabilities-refresh.ts';
import { createProviderRegistry } from '../providers.ts';
import type { PublishDeps } from './task.ts';
import { runPublish } from './task.ts';
import type { Seeded } from './testing.ts';
import {
  CLI,
  deps as fakeDeps,
  fixture,
  owner,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  updateDestination,
  verifyRunAt,
  workspaceId,
} from './testing-harness.ts';
import { runVerify } from './verify.ts';

const HOST = 'social.example.test';
const ORIGIN = `https://${HOST}`;
const TOKEN = 'CANARY_mastodon_access';
const IMAGE = new Uint8Array([137, 80, 78, 71]);

interface Reply {
  readonly status?: number;
  readonly json?: unknown;
}

interface Call {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
}

const routes = new Map<string, Reply[]>();
const calls: Call[] = [];

function reply(method: string, url: string, ...replies: Reply[]): void {
  routes.set(`${method} ${url}`, replies);
}

function respond(url: string, { status = 200, json }: Reply): EgressResponse {
  const text = JSON.stringify(json ?? {});
  return {
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    url,
    redirected: false,
    bytes: async () => new TextEncoder().encode(text),
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

const http: HttpClient = {
  async request(input, init: EgressRequest = {}) {
    const method = init.method ?? 'GET';
    const url = String(input);
    calls.push({
      method,
      url,
      headers: { ...init.headers },
      ...(init.body ? { body: init.body } : {}),
    });
    const next = routes.get(`${method} ${url}`)?.shift();
    if (next === undefined) throw new Error(`unexpected ${method} ${url}`);
    return respond(url, next);
  },
  fetch: () => Promise.reject(new Error('providers use request()')),
};

let test: TestDatabase;
let deps: PublishDeps;
let appId: string;
let accountSeq = 100;

async function mastodonApp(host: string): Promise<string> {
  const id = randomUUID();
  await fixture.operator.withActor(CLI, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({ id, provider: 'mastodon', instance_host: host, client_id: `client-${host}` })
      .execute(),
  );
  return id;
}

async function mastodonAccount(app: string, capabilities: unknown = {}): Promise<string> {
  const id = await fixture.connectAccount(app, {
    provider: 'mastodon',
    value: { accessToken: TOKEN },
  });
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({
        provider_account_id: `${++accountSeq}@${HOST}`,
        capabilities: JSON.stringify(capabilities),
      })
      .where('id', '=', id)
      .execute(),
  );
  return id;
}

function destination(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['state', 'state_reason', 'resolution', 'remote_id', 'remote_url', 'provider_state'])
      .select(['last_error_code', 'last_error_message'])
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

async function seedMastodon(text: string, capabilities: unknown = {}, withImage = false) {
  const accountId = await mastodonAccount(appId, capabilities);
  const media = withImage
    ? [
        {
          assetId: randomUUID(),
          sha256: 'b'.repeat(64),
          kind: 'image',
          mime: 'image/png',
          bytes: IMAGE.byteLength,
          altText: 'A small square',
          aiGenerated: false,
          transform: null,
        },
      ]
    : [];
  return await seed({ text, provider: 'mastodon', accountId, media });
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-mastodon');
  deps = {
    ...fakeDeps,
    providers: createProviderRegistry(manifests, runtimes, () => http),
    media: {
      signedUrl: () => Promise.reject(new Error('mastodon uploads bytes')),
      read: async () => IMAGE,
    },
  };
  appId = await mastodonApp(HOST);
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

beforeEach(() => {
  routes.clear();
  calls.length = 0;
});

const job = (seeded: Seeded) => ({ workspaceId, id: seeded.destinationId });

const recentUrl = (accountId: string | undefined) =>
  `${ORIGIN}/api/v1/accounts/${accountId}/statuses?limit=40&exclude_reblogs=true`;

async function providerAccountId(seeded: Seeded): Promise<string> {
  const row = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('social_accounts')
      .select('provider_account_id')
      .where('id', '=', seeded.accountId)
      .executeTakeFirstOrThrow(),
  );
  return row.provider_account_id;
}

describe('mastodon publishing end to end', () => {
  it('uploads the image and posts the status with an idempotency key', async () => {
    const seeded = await seedMastodon('Ahoj z Mastodonu', {}, true);
    reply('POST', `${ORIGIN}/api/v2/media`, { json: { id: '301' } });
    reply('POST', `${ORIGIN}/api/v1/statuses`, {
      json: { id: '113000000000000001', url: `${ORIGIN}/@alice/113000000000000001` },
    });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: '113000000000000001',
      remote_url: `${ORIGIN}/@alice/113000000000000001`,
      provider_state: { media: expect.any(Object), status: { id: '113000000000000001' } },
    });
    const post = calls.find((call) => call.url.endsWith('/api/v1/statuses'));
    expect(post?.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(post?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(new URLSearchParams(String(post?.body)).getAll('media_ids[]')).toEqual(['301']);
  });

  it('verifies an ambiguous send by reading recent statuses', async () => {
    const seeded = await seedMastodon('Overenie textom');
    reply('POST', `${ORIGIN}/api/v1/statuses`, { status: 502 });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({ state: 'verifying' });
    await updateDestination(seeded, sql`run_at = now() - interval '1 second'`);

    const accountId = (await providerAccountId(seeded)).split('@')[0];
    reply('GET', recentUrl(accountId), {
      json: [
        {
          id: '113000000000000002',
          created_at: new Date().toISOString(),
          url: `${ORIGIN}/@alice/113000000000000002`,
          content: '<p>Overenie textom</p>',
          media_attachments: [],
        },
      ],
    });
    await runVerify(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'verified',
      remote_id: '113000000000000002',
    });
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('keeps checking, without sending again, while recent statuses show no match', async () => {
    const seeded = await seedMastodon('Druhý pokus');
    reply('POST', `${ORIGIN}/api/v1/statuses`, { status: 503 });
    await runPublish(deps, job(seeded));
    await updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
    const accountId = (await providerAccountId(seeded)).split('@')[0];
    reply('GET', recentUrl(accountId), { json: [] });
    const before = Date.now();
    await runVerify(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'ambiguous_response',
    });
    expect((await verifyRunAt(seeded))?.getTime()).toBeGreaterThan(before);
    expect(calls.map((call) => call.method)).toEqual(['POST', 'GET']);
  });

  it("fails preflight at claim against the server's own limits", async () => {
    const seeded = await seedMastodon('Príliš dlhý text', { instance: { maxCharacters: 5 } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'permanent_error',
      last_error_code: 'preflight_invalid',
      last_error_message: 'text_too_long',
    });
    expect(calls).toEqual([]);
  });
});

describe('account capabilities refresh', () => {
  const STALE = '2026-01-01T00:00:00Z';
  const instance = (max: number) => ({
    json: { configuration: { statuses: { max_characters: max, max_media_attachments: 4 } } },
  });

  function capabilitiesOf(id: string) {
    return owner.withActor(SYSTEM, async (trx) => {
      const row = await trx
        .selectFrom('social_accounts')
        .select('capabilities')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      return row.capabilities as { instance: { maxCharacters?: number }; fetchedAt: string };
    });
  }

  it('re-reads each stale host once and keeps the old values when a server fails', async () => {
    await owner.withActor(SYSTEM, (trx) =>
      sql`update social_accounts set status = 'disconnected' where provider = 'mastodon'`.execute(
        trx,
      ),
    );
    const stale = { instance: { maxCharacters: 500 }, fetchedAt: STALE };
    const first = await mastodonAccount(appId, stale);
    const second = await mastodonAccount(appId, stale);
    const fresh = { instance: { maxCharacters: 700 }, fetchedAt: new Date().toISOString() };
    const current = await mastodonAccount(appId, fresh);
    const brokenApp = await mastodonApp('broken.example.test');
    const broken = await mastodonAccount(brokenApp, stale);
    reply('GET', `${ORIGIN}/api/v2/instance`, instance(1000));
    reply('GET', 'https://broken.example.test/api/v2/instance', { status: 503 });

    const detail = JSON.parse(await refreshCapabilities(deps));
    expect(detail).toEqual({ accounts: 3, hosts: 2, failedHosts: 1, updated: 2 });
    expect(calls.map((call) => call.url).sort()).toEqual([
      'https://broken.example.test/api/v2/instance',
      `${ORIGIN}/api/v2/instance`,
    ]);
    for (const id of [first, second]) {
      const updated = await capabilitiesOf(id);
      expect(updated.instance.maxCharacters).toBe(1000);
      expect(updated.fetchedAt).not.toBe(STALE);
    }
    expect(await capabilitiesOf(current)).toEqual(fresh);
    expect(await capabilitiesOf(broken)).toEqual(stale);
  });
});
