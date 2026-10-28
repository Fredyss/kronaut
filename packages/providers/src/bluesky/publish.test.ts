import { createHash } from 'node:crypto';
import type {
  MediaRef,
  ProviderState,
  PublishContext,
  PublishInput,
  PublishItem,
} from '@kronaut/core';
import { decodeJwt } from 'jose';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import {
  egressError,
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { generateDpopKey } from './dpop.ts';
import type { BlueskySettings } from './manifest.ts';
import { type BlueskyCredentials, blueskyRuntime } from './runtime.ts';
import { AS, DID, failureOf, fakeDns, PDS, TOKEN, testApp } from './testing.ts';

const UPLOAD = `${PDS}/xrpc/com.atproto.repo.uploadBlob`;
const CREATE = `${PDS}/xrpc/com.atproto.repo.createRecord`;
const RKEY = '3m4ab2cdefgh2';
const AT_URI = `at://${DID}/app.bsky.feed.post/${RKEY}`;
const FROZEN = { rkey: RKEY, createdAt: '2026-10-21T11:59:00.000Z', facets: [], blobs: {} };
const MENTIONED = 'did:plc:mmmmmmmmmmmmmmmmmmmmmmmm';

const credentials: BlueskyCredentials = {
  did: DID,
  pds: PDS,
  issuer: AS,
  tokenEndpoint: TOKEN,
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  dpopJwk: await generateDpopKey(),
  pdsNonce: 'pn0',
};

const jpeg: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/jpeg',
  bytes: 3,
  width: 800,
  height: 600,
  altText: 'A cat',
  aiGenerated: false,
};
const png: MediaRef = {
  id: 'm2',
  sha256: 'b'.repeat(64),
  mime: 'image/png',
  bytes: 2,
  aiGenerated: false,
};
const media = {
  m1: { url: 'https://media.example.org/m1', bytes: new Uint8Array([1, 2, 3]) },
  m2: { url: 'https://media.example.org/m2', bytes: new Uint8Array([4, 5]) },
};

function blob(link: string, mimeType: string, size: number) {
  return { $type: 'blob', ref: { $link: link }, mimeType, size };
}

function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

function input(
  items: readonly PublishItem[],
  state: ProviderState = {},
): PublishInput<BlueskyCredentials, BlueskySettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'post',
    account: { providerAccountId: DID },
    credentials,
    app: testApp(undefined, []),
    settings: {},
    items,
    state,
  };
}

function uploaded(link: string, mimeType: string, size: number, nonce: string): ScriptedExchange {
  return {
    method: 'POST',
    url: UPLOAD,
    headers: { 'dpop-nonce': nonce },
    json: { blob: blob(link, mimeType, size) },
  };
}

function created(overrides: Partial<ScriptedExchange> = {}): ScriptedExchange {
  return {
    method: 'POST',
    url: CREATE,
    headers: { 'dpop-nonce': 'pn9' },
    json: { uri: AT_URI, cid: 'bafyreicid' },
    ...overrides,
  };
}

function bodyOf(request: RecordedRequest | undefined): Record<string, unknown> {
  if (typeof request?.body !== 'string') throw new Error('expected a JSON body');
  return JSON.parse(request.body);
}

function proofOf(request: RecordedRequest | undefined) {
  return decodeJwt(request?.headers.dpop ?? '');
}

function withDns(ctx: PublishContext, records: Readonly<Record<string, readonly string[]>>) {
  return { ...ctx, dns: fakeDns(records) };
}

function verify(ctx: PublishContext, state: ProviderState) {
  if (blueskyRuntime.verify === undefined) throw new Error('bluesky verifies');
  return blueskyRuntime.verify(ctx, input([main('x')], state));
}

describe('bluesky publish', () => {
  it('freezes rkey and createdAt first, uploads blobs with DPoP and creates the exact record', async () => {
    const text = 'Ahoj 👋 @alice.example.com, čítaj https://example.com/path?q=1. #kronaut!';
    const http = scriptedHttp([
      { url: 'https://alice.example.com/.well-known/atproto-did', status: 404 },
      uploaded('bafkrei1', 'image/jpeg', 3, 'pn1'),
      uploaded('bafkrei2', 'image/png', 2, 'pn2'),
      created(),
    ]);
    const { ctx, checkpoints, events } = testPublishContext(http, media);
    const result = await blueskyRuntime.publish(
      withDns(ctx, { '_atproto.alice.example.com': [`did=${MENTIONED}`] }),
      input([main(text, [jpeg, png])]),
    );
    http.assertDone();

    expect(events.slice(0, 2)).toEqual(['checkpoint', 'step:upload_blobs']);
    const { rkey, createdAt } = checkpoints[0] ?? {};
    expect(rkey).toMatch(/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/);
    expect(createdAt).toBe('2026-10-21T12:00:00.000Z');
    expect(events.indexOf('step:create_record')).toBe(events.length - 2);

    const ath = createHash('sha256').update('access-1').digest('base64url');
    const [, first, second, create] = http.calls;
    for (const [call, nonce] of [
      [first, 'pn0'],
      [second, 'pn1'],
      [create, 'pn2'],
    ] as const) {
      expect(call?.headers.authorization).toBe('DPoP access-1');
      expect(proofOf(call)).toMatchObject({ htm: 'POST', htu: call?.url, ath, nonce });
    }
    expect(first?.headers['content-type']).toBe('image/jpeg');
    expect(first?.body).toEqual(media.m1.bytes);
    expect(second?.headers['content-type']).toBe('image/png');

    expect(bodyOf(create)).toEqual({
      repo: DID,
      collection: 'app.bsky.feed.post',
      rkey,
      record: {
        $type: 'app.bsky.feed.post',
        text,
        createdAt,
        facets: [
          {
            index: { byteStart: 10, byteEnd: 28 },
            features: [{ $type: 'app.bsky.richtext.facet#mention', did: MENTIONED }],
          },
          {
            index: { byteStart: 38, byteEnd: 66 },
            features: [
              { $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com/path?q=1' },
            ],
          },
          {
            index: { byteStart: 68, byteEnd: 76 },
            features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'kronaut' }],
          },
        ],
        embed: {
          $type: 'app.bsky.embed.images',
          images: [
            {
              alt: 'A cat',
              image: blob('bafkrei1', 'image/jpeg', 3),
              aspectRatio: { width: 800, height: 600 },
            },
            { alt: '', image: blob('bafkrei2', 'image/png', 2) },
          ],
        },
      },
    });
    expect(result).toEqual({
      kind: 'published',
      remoteId: AT_URI,
      url: `https://bsky.app/profile/${DID}/post/${rkey}`,
      anchor: { cid: 'bafyreicid' },
    });
  });

  it('reuses the frozen rkey, createdAt and blobs on a retry', async () => {
    const firstHttp = scriptedHttp([
      uploaded('bafkrei1', 'image/jpeg', 3, 'pn1'),
      created({ status: 500, json: { error: 'InternalServerError' } }),
    ]);
    const first = testPublishContext(firstHttp, media);
    await failureOf(blueskyRuntime.publish(first.ctx, input([main('hello', [jpeg])])));
    const state = first.checkpoints.at(-1) ?? {};

    const http = scriptedHttp([created()]);
    const later = TEST_NOW.add({ hours: 1 });
    const { ctx } = testPublishContext(http, media, later);
    await blueskyRuntime.publish(ctx, input([main('hello', [jpeg])], state));
    http.assertDone();

    const before = bodyOf(firstHttp.calls[1]);
    const after = bodyOf(http.calls[0]);
    expect(after.rkey).toBe(before.rkey);
    expect(after.record).toEqual(before.record);
  });

  it('maps createRecord failures: 500, timeouts and a missing nonce are ambiguous, 400 permanent, 429 rate limited', async () => {
    const outcome = async (exchange: Partial<ScriptedExchange>) => {
      const { ctx } = testPublishContext(scriptedHttp([created(exchange)]));
      return failureOf(blueskyRuntime.publish(ctx, input([main('hello')], FROZEN)));
    };
    expect(await outcome({ status: 500, json: { error: 'InternalServerError' } })).toMatchObject({
      kind: 'ambiguous',
    });
    expect(await outcome({ error: egressError('timeout') })).toMatchObject({ kind: 'ambiguous' });
    expect(await outcome({ headers: {} })).toMatchObject({ kind: 'ambiguous' });
    expect(
      await outcome({ status: 400, json: { error: 'InvalidRequest', message: 'bad record' } }),
    ).toEqual({ kind: 'permanent', code: 'InvalidRequest' });
    expect(
      await outcome({
        status: 429,
        headers: { 'ratelimit-reset': '1792584000', 'ratelimit-policy': '5000;w=3600' },
        json: { error: 'RateLimitExceeded' },
      }),
    ).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: Temporal.Instant.fromEpochMilliseconds(1_792_584_000_000),
    });
  });

  it('retries uploadBlob once with the nonce from a PDS use_dpop_nonce 401', async () => {
    const http = scriptedHttp([
      {
        method: 'POST',
        url: UPLOAD,
        status: 401,
        headers: { 'dpop-nonce': 'pn1', 'www-authenticate': 'DPoP error="use_dpop_nonce"' },
        json: { error: 'use_dpop_nonce' },
      },
      uploaded('bafkrei1', 'image/jpeg', 3, 'pn2'),
      created(),
    ]);
    const { ctx } = testPublishContext(http, media);
    const result = await blueskyRuntime.publish(ctx, input([main('', [jpeg])], FROZEN));
    http.assertDone();
    expect(result.kind).toBe('published');
    expect(http.calls.map((call) => proofOf(call).nonce)).toEqual(['pn0', 'pn1', 'pn2']);
  });

  it('verifies by an unauthenticated getRecord on the frozen rkey', async () => {
    const lookup = `${PDS}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(DID)}&collection=app.bsky.feed.post&rkey=${RKEY}`;
    const run = async (exchange: Omit<ScriptedExchange, 'url'>) => {
      const http = scriptedHttp([{ url: lookup, ...exchange }]);
      const { ctx } = testPublishContext(http);
      const refusing: PublishContext = {
        ...ctx,
        step: () => Promise.reject(new Error('verify must not run steps')),
        checkpoint: () => Promise.reject(new Error('verify must not checkpoint')),
      };
      const result = await verify(refusing, FROZEN);
      http.assertDone();
      expect(http.calls[0]?.headers).not.toHaveProperty('authorization');
      expect(http.calls[0]?.headers).not.toHaveProperty('dpop');
      return result;
    };
    const ours = { $type: 'app.bsky.feed.post', text: 'x', createdAt: FROZEN.createdAt };
    expect(await run({ json: { uri: AT_URI, cid: 'c', value: ours } })).toEqual({
      kind: 'found',
      remoteId: AT_URI,
      url: `https://bsky.app/profile/${DID}/post/${RKEY}`,
      anchor: { cid: 'c' },
    });
    expect(await run({ json: { uri: AT_URI, value: ours } })).toEqual({
      kind: 'found',
      remoteId: AT_URI,
      url: `https://bsky.app/profile/${DID}/post/${RKEY}`,
    });
    expect(
      await run({ json: { uri: AT_URI, cid: 'c', value: { ...ours, text: 'someone else' } } }),
    ).toEqual({ kind: 'inconclusive' });
    expect(await run({ status: 400, json: { error: 'RecordNotFound' } })).toEqual({
      kind: 'absent',
    });
    expect(await run({ status: 502, text: 'bad gateway' })).toEqual({ kind: 'inconclusive' });
  });

  it('rejects invalid input with a specific code before any network call', async () => {
    const reject = async (items: readonly PublishItem[]) => {
      const http = scriptedHttp([]);
      const { ctx, checkpoints } = testPublishContext(http);
      const error = await failureOf(blueskyRuntime.publish(ctx, input(items)));
      expect(http.calls).toHaveLength(0);
      expect(checkpoints).toHaveLength(0);
      return error;
    };
    const five = ['1', '2', '3', '4', '5'].map((id) => ({ ...jpeg, id }));
    expect(await reject([main('é'.repeat(301))])).toEqual({
      kind: 'permanent',
      code: 'text_too_long',
    });
    expect(await reject([main('hi', five)])).toEqual({
      kind: 'permanent',
      code: 'too_many_images',
    });
    expect(
      await reject([main('hi'), { position: 1, role: 'thread', text: 'more', media: [] }]),
    ).toEqual({
      kind: 'permanent',
      code: 'item_multiple',
    });
    expect(await reject([main('hi', [{ ...jpeg, mime: 'image/gif' }])])).toEqual({
      kind: 'permanent',
      code: 'media_type_unsupported',
    });
  });

  it('drops unresolvable mentions and anything inside a URL, keeping only the link facet', async () => {
    const text = 'hi @ghost.example.com see https://example.com/a#x@y';
    const http = scriptedHttp([
      { url: 'https://ghost.example.com/.well-known/atproto-did', status: 404 },
      created(),
    ]);
    const { ctx } = testPublishContext(http);
    const result = await blueskyRuntime.publish(withDns(ctx, {}), input([main(text)]));
    http.assertDone();
    expect(result.kind).toBe('published');
    const { record } = bodyOf(http.calls[1]) as { record: { facets: unknown } };
    expect(record.facets).toEqual([
      {
        index: { byteStart: 26, byteEnd: 51 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com/a#x@y' }],
      },
    ]);
  });
});
