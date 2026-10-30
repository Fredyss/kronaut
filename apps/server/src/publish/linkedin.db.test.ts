import { randomUUID } from 'node:crypto';
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

const SUB = 'aB3_x-9Q';
const TOKEN = 'CANARY_linkedin_member_access';
const POSTS = 'https://api.linkedin.com/rest/posts';
const INIT = 'https://api.linkedin.com/rest/images?action=initializeUpload';
const UPLOAD = (n: number) => `https://www.linkedin.com/dms-uploads/sp/upload-${n}`;
const SHARE = 'urn:li:share:7123456789012345678';
const POST_URL = `https://www.linkedin.com/feed/update/${SHARE}`;

interface Reply {
  readonly status?: number;
  readonly json?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
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

function respond(url: string, { status = 200, json, headers = {} }: Reply): EgressResponse {
  const text = json === undefined ? '' : JSON.stringify(json);
  return {
    status,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
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

function image(altText: string | null) {
  return {
    assetId: randomUUID(),
    sha256: 'd'.repeat(64),
    kind: 'image',
    mime: 'image/png',
    bytes: 4,
    altText,
    aiGenerated: false,
    transform: null,
  };
}

async function connectMember(): Promise<string> {
  const appId = await fixture.createApp('86abcdef123xyz', 'linkedin');
  await fixture.operator.withActor(CLI, (trx) =>
    trx
      .updateTable('provider_apps')
      .set(sealAppSecret(keyring, appId, 'linkedin', 'CANARY_linkedin_client_secret'))
      .where('id', '=', appId)
      .execute(),
  );
  const id = await fixture.connectAccount(appId, {
    provider: 'linkedin',
    value: { accessToken: TOKEN },
  });
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ provider_account_id: SUB, account_kind: 'person' })
      .where('id', '=', id)
      .execute(),
  );
  return id;
}

const seedLinkedin = (text: string, alts: readonly (string | null)[] = []): Promise<Seeded> =>
  seed({ text, provider: 'linkedin', accountId, media: alts.map(image) });

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

function postBodies(): unknown[] {
  return calls
    .filter((call) => call.method === 'POST' && call.url === POSTS)
    .map((call) => JSON.parse(String(call.body)));
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-linkedin');
  deps = {
    ...fakeDeps,
    providers: createProviderRegistry(manifests, runtimes, () => http),
    media: {
      signedUrl: () => Promise.reject(new Error('linkedin uploads bytes')),
      read: async () => new Uint8Array([1, 2, 3, 4]),
    },
  };
  accountId = await connectMember();
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

beforeEach(() => {
  routes.clear();
  calls.length = 0;
});

describe('linkedin publishing end to end', () => {
  it('publishes a text post with its feed URL', async () => {
    const seeded = await seedLinkedin('Ahoj z LinkedInu #novinka');
    reply('POST', POSTS, { status: 201, headers: { 'x-restli-id': SHARE } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: SHARE,
      remote_url: POST_URL,
    });
    expect(postBodies()).toEqual([
      expect.objectContaining({
        author: `urn:li:person:${SUB}`,
        commentary: 'Ahoj z LinkedInu \\#novinka',
        lifecycleState: 'PUBLISHED',
      }),
    ]);
  });

  it('uploads two images and posts them as multiImage with the composer alt text', async () => {
    const seeded = await seedLinkedin('Dve fotky', ['Prvá fotka', null]);
    reply(
      'POST',
      INIT,
      { json: { value: { uploadUrl: UPLOAD(1), image: 'urn:li:image:C1' } } },
      { json: { value: { uploadUrl: UPLOAD(2), image: 'urn:li:image:C2' } } },
    );
    reply('PUT', UPLOAD(1), { status: 201 });
    reply('PUT', UPLOAD(2), { status: 201 });
    reply('POST', POSTS, { status: 201, headers: { 'x-restli-id': SHARE } });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: SHARE,
      remote_url: POST_URL,
    });
    const puts = calls.filter((call) => call.method === 'PUT');
    expect(puts.map((call) => call.body instanceof Uint8Array)).toEqual([true, true]);
    expect(postBodies()).toEqual([
      expect.objectContaining({
        content: {
          multiImage: {
            images: [{ id: 'urn:li:image:C1', altText: 'Prvá fotka' }, { id: 'urn:li:image:C2' }],
          },
        },
      }),
    ]);
  });

  it('marks an ambiguous create_post unconfirmed without sending or reading it again', async () => {
    const seeded = await seedLinkedin('Nejasné');
    reply('POST', POSTS, { status: 500 });
    await runPublish(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'ambiguous_response',
    });

    await updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
    await runVerify(deps, job(seeded));
    expect(await destination(seeded)).toMatchObject({ state: 'unconfirmed', remote_id: null });
    expect(calls).toHaveLength(1);
  });
});
