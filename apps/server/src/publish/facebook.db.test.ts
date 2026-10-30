import { createHmac, randomUUID } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { EgressRequest, EgressResponse, HttpClient } from '@kronaut/egress';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sealAppSecret } from '../credential-store.ts';
import { createProviderRegistry } from '../providers.ts';
import type { PublishDeps } from './task.ts';
import { runPublish } from './task.ts';
import {
  CLI,
  deps as fakeDeps,
  fixture,
  keyring,
  owner,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  updateDestination,
  workspaceId,
} from './testing/harness.ts';
import type { Seeded } from './testing.ts';
import { runVerify } from './verify.ts';

const PAGE_ID = '1012345678901234';
const TOKEN = 'CANARY_facebook_page_access';
const SECRET = 'CANARY_facebook_app_secret';
const PROOF = createHmac('sha256', SECRET).update(TOKEN).digest('hex');
const GRAPH = 'https://graph.facebook.com/v26.0';
const SIGNED = `access_token=${TOKEN}&appsecret_proof=${PROOF}`;
const FEED = `${GRAPH}/${PAGE_ID}/feed`;
const PHOTOS = `${GRAPH}/${PAGE_ID}/photos`;
const POST_ID = `${PAGE_ID}_5550001112223334`;
const PERMALINK = 'https://www.facebook.com/ada.bakery/posts/pfbid0xyz';
const PERMALINK_READ = `${GRAPH}/${POST_ID}?fields=id%2Cpermalink_url&${SIGNED}`;
const RECENT = `${GRAPH}/${PAGE_ID}/published_posts?fields=id%2Cmessage%2Ccreated_time%2Cpermalink_url&limit=25&${SIGNED}`;

interface Reply {
  readonly status?: number;
  readonly json?: unknown;
}

interface Call {
  readonly method: string;
  readonly url: string;
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
    calls.push({ method, url, ...(init.body ? { body: init.body } : {}) });
    const next = routes.get(`${method} ${url}`)?.shift();
    if (next === undefined) throw new Error(`unexpected ${method} ${url}`);
    return respond(url, next);
  },
  fetch: () => Promise.reject(new Error('providers use request()')),
};

let test: TestDatabase;
let deps: PublishDeps;
let accountId: string;

function image() {
  return {
    assetId: randomUUID(),
    sha256: 'c'.repeat(64),
    kind: 'image',
    mime: 'image/png',
    bytes: 4,
    altText: null,
    aiGenerated: false,
    transform: null,
  };
}

async function connectPage(): Promise<string> {
  const appId = await fixture.createApp('1234567890123456', 'facebook');
  await fixture.operator.withActor(CLI, (trx) =>
    trx
      .updateTable('provider_apps')
      .set(sealAppSecret(keyring, appId, 'facebook', SECRET))
      .where('id', '=', appId)
      .execute(),
  );
  const id = await fixture.connectAccount(appId, {
    provider: 'facebook',
    value: { accessToken: TOKEN },
  });
  await owner.withActor(SYSTEM, async (trx) => {
    await trx
      .updateTable('social_accounts')
      .set({ provider_account_id: PAGE_ID, account_kind: 'page' })
      .where('id', '=', id)
      .execute();
    await trx
      .updateTable('account_credentials')
      .set({ kind: 'page_token' })
      .where('social_account_id', '=', id)
      .execute();
  });
  return id;
}

const seedFacebook = (text: string, images = 0): Promise<Seeded> =>
  seed({ text, provider: 'facebook', accountId, media: Array.from({ length: images }, image) });

function destination(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['state', 'state_reason', 'resolution', 'remote_id', 'remote_url', 'provider_state'])
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

const job = (seeded: Seeded) => ({ workspaceId, id: seeded.destinationId });
const due = (seeded: Seeded) =>
  updateDestination(seeded, sql`run_at = now() - interval '1 second'`);

function feedForms(): Record<string, string>[] {
  return calls
    .filter((call) => call.method === 'POST' && call.url === FEED)
    .map((call) => Object.fromEntries(new URLSearchParams(String(call.body))));
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-facebook');
  deps = {
    ...fakeDeps,
    providers: createProviderRegistry(manifests, runtimes, () => http),
    media: {
      signedUrl: () => Promise.reject(new Error('facebook uploads bytes')),
      read: async () => new Uint8Array([1, 2, 3, 4]),
    },
  };
  accountId = await connectPage();
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

beforeEach(() => {
  routes.clear();
  calls.length = 0;
});

describe('facebook publishing end to end', () => {
  it('publishes a text post with its permalink', async () => {
    const seeded = await seedFacebook('Ahoj z Facebooku');
    reply('POST', FEED, { json: { id: POST_ID } });
    reply('GET', PERMALINK_READ, { json: { id: POST_ID, permalink_url: PERMALINK } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: POST_ID,
      remote_url: PERMALINK,
    });
    expect(feedForms()).toEqual([
      { message: 'Ahoj z Facebooku', access_token: TOKEN, appsecret_proof: PROOF },
    ]);
  });

  it('uploads two unpublished photos and attaches them to one post', async () => {
    const seeded = await seedFacebook('Dve fotky', 2);
    reply('POST', PHOTOS, { json: { id: '901' } }, { json: { id: '902' } });
    reply('POST', FEED, { json: { id: POST_ID } });
    reply('GET', PERMALINK_READ, { json: { id: POST_ID, permalink_url: PERMALINK } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: POST_ID,
      remote_url: PERMALINK,
    });
    const uploads = calls.filter((call) => call.url === PHOTOS);
    expect(uploads.map((call) => call.body instanceof Uint8Array)).toEqual([true, true]);
    expect(feedForms()).toEqual([
      {
        message: 'Dve fotky',
        'attached_media[0]': '{"media_fbid":"901"}',
        'attached_media[1]': '{"media_fbid":"902"}',
        access_token: TOKEN,
        appsecret_proof: PROOF,
      },
    ]);
  });

  it('verifies an ambiguous create_post instead of sending it again', async () => {
    const seeded = await seedFacebook('Overenie');
    reply('POST', FEED, { status: 502 });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({ state: 'verifying' });

    await due(seeded);
    reply('GET', RECENT, {
      json: {
        data: [
          {
            id: POST_ID,
            message: 'Overenie',
            created_time: new Date().toISOString().replace(/\.\d{3}Z$/, '+0000'),
            permalink_url: PERMALINK,
          },
        ],
      },
    });
    await runVerify(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'verified',
      remote_id: POST_ID,
      remote_url: PERMALINK,
    });
    expect(calls.filter((call) => call.url === FEED)).toHaveLength(1);
  });
});
