import { randomUUID } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { EgressRequest, EgressResponse, HttpClient } from '@kronaut/egress';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProviderRegistry } from '../providers.ts';
import type { PublishDeps } from './task.ts';
import { runPublish } from './task.ts';
import type { Seeded } from './testing.ts';
import {
  deps as fakeDeps,
  fixture,
  owner,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  updateDestination,
  workspaceId,
} from './testing-harness.ts';
import { runVerify } from './verify.ts';

const USER_ID = '7654321';
const TOKEN = 'CANARY_threads_access';
const GRAPH = 'https://graph.threads.com/v1.0';
const CREATE = `${GRAPH}/${USER_ID}/threads?access_token=${TOKEN}`;
const PUBLISH = `${GRAPH}/${USER_ID}/threads_publish?access_token=${TOKEN}`;
const RECENT = `${GRAPH}/${USER_ID}/threads?fields=id%2Cpermalink%2Ctext%2Ctimestamp%2Cmedia_type%2Cchildren&limit=10&access_token=${TOKEN}`;
const POST_ID = '18060000000000001';
const PERMALINK = 'https://www.threads.com/@ada/post/DXyz789';

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
let appId: string;

const statusUrl = (id: string) =>
  `${GRAPH}/${id}?fields=status%2Cerror_message&access_token=${TOKEN}`;
const permalinkUrl = `${GRAPH}/${POST_ID}?fields=permalink&access_token=${TOKEN}`;

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

async function seedThreads(text: string, images = 0): Promise<Seeded> {
  const accountId = await fixture.connectAccount(appId, {
    provider: 'threads',
    value: {
      userId: USER_ID,
      accessToken: TOKEN,
      issuedAt: '2026-10-20T00:00:00Z',
      scopes: ['threads_basic', 'threads_content_publish'],
    },
  });
  const media = Array.from({ length: images }, image);
  return await seed({ text, provider: 'threads', accountId, media });
}

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

function forms(): Record<string, string>[] {
  return calls
    .filter((call) => call.method === 'POST')
    .map((call) => Object.fromEntries(new URLSearchParams(String(call.body))));
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-threads');
  deps = {
    ...fakeDeps,
    providers: createProviderRegistry(manifests, runtimes, () => http),
    media: {
      signedUrl: async (_workspace, mediaId) => `https://media.example.test/${mediaId}?sig=x`,
      read: () => Promise.reject(new Error('threads fetches signed URLs')),
    },
  };
  appId = await fixture.createApp('1122334455667788', 'threads');
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

beforeEach(() => {
  routes.clear();
  calls.length = 0;
});

describe('threads publishing end to end', () => {
  it('creates a text container, waits, then publishes it with a permalink', async () => {
    const seeded = await seedThreads('Ahoj z Threads');
    reply('POST', CREATE, { json: { id: '17890000000000001' } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'provider_processing',
      provider_state: { container: '17890000000000001' },
    });

    await due(seeded);
    reply('GET', statusUrl('17890000000000001'), { json: { status: 'FINISHED' } });
    reply('POST', PUBLISH, { json: { id: POST_ID } });
    reply('GET', permalinkUrl, { json: { id: POST_ID, permalink: PERMALINK } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: POST_ID,
      remote_url: PERMALINK,
    });
    expect(forms()).toEqual([
      { media_type: 'TEXT', text: 'Ahoj z Threads' },
      { creation_id: '17890000000000001' },
    ]);
  });

  it('publishes a carousel from item containers', async () => {
    const seeded = await seedThreads('Dve fotky', 2);
    reply(
      'POST',
      CREATE,
      { json: { id: '17890000000000011' } },
      { json: { id: '17890000000000012' } },
      { json: { id: '17890000000000010' } },
    );
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({ state: 'retry_wait' });

    await due(seeded);
    reply('GET', statusUrl('17890000000000010'), { json: { status: 'FINISHED' } });
    reply('POST', PUBLISH, { json: { id: POST_ID } });
    reply('GET', permalinkUrl, { json: { id: POST_ID, permalink: PERMALINK } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: POST_ID,
      remote_url: PERMALINK,
    });
    const [first, second, carousel, published] = forms();
    expect([first?.is_carousel_item, second?.is_carousel_item]).toEqual(['true', 'true']);
    expect(first?.image_url).toMatch(/^https:\/\/media\.example\.test\//);
    expect(carousel).toEqual({
      media_type: 'CAROUSEL',
      children: '17890000000000011,17890000000000012',
      text: 'Dve fotky',
    });
    expect(published).toEqual({ creation_id: '17890000000000010' });
  });

  it('verifies an ambiguous threads_publish instead of sending it again', async () => {
    const seeded = await seedThreads('Overenie');
    reply('POST', CREATE, { json: { id: '17890000000000021' } });
    await runPublish(deps, job(seeded));
    await due(seeded);
    reply('GET', statusUrl('17890000000000021'), { json: { status: 'FINISHED' } });
    reply('POST', PUBLISH, { status: 502 });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({ state: 'verifying' });

    await due(seeded);
    reply('GET', statusUrl('17890000000000021'), { json: { status: 'PUBLISHED' } });
    reply('GET', RECENT, {
      json: {
        data: [
          {
            id: POST_ID,
            text: 'Overenie',
            media_type: 'TEXT_POST',
            timestamp: new Date().toISOString(),
            permalink: PERMALINK,
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
    expect(calls.filter((call) => call.url === PUBLISH)).toHaveLength(1);
  });
});
