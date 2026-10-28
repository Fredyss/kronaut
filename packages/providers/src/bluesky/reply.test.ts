import type { ChainLink, MediaRef, ProviderState, PublishInput, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { generateDpopKey } from './dpop.ts';
import type { BlueskySettings } from './manifest.ts';
import { blueskyManifest } from './manifest.ts';
import { type BlueskyCredentials, blueskyRuntime } from './runtime.ts';
import { AS, DID, failureOf, PDS, TOKEN, testApp } from './testing.ts';

const CREATE = `${PDS}/xrpc/com.atproto.repo.createRecord`;
const ROOT_URI = `at://${DID}/app.bsky.feed.post/3m4aaaaaaaaa2`;
const MIDDLE_URI = `at://${DID}/app.bsky.feed.post/3m4bbbbbbbbb2`;
const RKEY = '3m4ccccccccc2';
const REPLY_URI = `at://${DID}/app.bsky.feed.post/${RKEY}`;
const FROZEN = { rkey: RKEY, createdAt: '2026-10-21T11:59:00.000Z', facets: [], blobs: {} };

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

const root: ChainLink = { position: 0, role: 'main', remoteId: ROOT_URI, anchor: { cid: 'cid-0' } };
const middle: ChainLink = {
  position: 1,
  role: 'thread',
  remoteId: MIDDLE_URI,
  anchor: { cid: 'cid-1' },
};

const jpeg: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/jpeg',
  bytes: 3,
  aiGenerated: false,
};

function reply(text: string, position = 2, role: PublishItem['role'] = 'thread'): PublishItem {
  return { position, role, text, media: [] };
}

function input(
  item: PublishItem,
  chain: readonly ChainLink[] | undefined,
  state: ProviderState = FROZEN,
): PublishInput<BlueskyCredentials, BlueskySettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'post',
    account: { providerAccountId: DID },
    credentials,
    app: testApp(undefined, []),
    settings: {},
    items: [item],
    ...(chain === undefined ? {} : { chain }),
    state,
  };
}

const created: ScriptedExchange = {
  method: 'POST',
  url: CREATE,
  headers: { 'dpop-nonce': 'pn9' },
  json: { uri: REPLY_URI, cid: 'cid-2' },
};

async function rejected(item: PublishItem, chain?: readonly ChainLink[]) {
  const http = scriptedHttp([]);
  const { ctx } = testPublishContext(http);
  const error = await failureOf(blueskyRuntime.publish(ctx, input(item, chain)));
  expect(http.calls).toHaveLength(0);
  return error;
}

describe('bluesky replies', () => {
  it('declares text-only reply chains of up to 24 items', () => {
    expect(blueskyManifest.postTypes.map((type) => [type.id, type.thread?.maxItems])).toEqual([
      ['post', 24],
    ]);
    expect(blueskyManifest.postTypes[0]?.thread?.media.maxCount).toBe(0);
    expect(blueskyManifest.postTypes[0]?.comment).toBeUndefined();
  });

  it('answers the last link with the main post as root and returns the reply cid', async () => {
    const http = scriptedHttp([created]);
    const { ctx } = testPublishContext(http);
    const result = await blueskyRuntime.publish(ctx, input(reply('Druhá časť'), [root, middle]));
    http.assertDone();
    const body = JSON.parse(String(http.calls[0]?.body));
    expect(body.rkey).toBe(RKEY);
    expect(body.record).toEqual({
      $type: 'app.bsky.feed.post',
      text: 'Druhá časť',
      createdAt: FROZEN.createdAt,
      reply: {
        root: { uri: ROOT_URI, cid: 'cid-0' },
        parent: { uri: MIDDLE_URI, cid: 'cid-1' },
      },
    });
    expect(result).toEqual({
      kind: 'published',
      remoteId: REPLY_URI,
      url: `https://bsky.app/profile/${DID}/post/${RKEY}`,
      anchor: { cid: 'cid-2' },
    });
  });

  it('freezes a fresh rkey and createdAt in the reply item own state', async () => {
    const http = scriptedHttp([created]);
    const { ctx, checkpoints } = testPublishContext(http);
    await blueskyRuntime.publish(ctx, input(reply('Prvá odpoveď', 1), [root], {}));
    const [frozen] = checkpoints;
    const body = JSON.parse(String(http.calls[0]?.body));
    expect(body.rkey).toBe(frozen?.rkey);
    expect(body.record.reply).toEqual({
      root: { uri: ROOT_URI, cid: 'cid-0' },
      parent: { uri: ROOT_URI, cid: 'cid-0' },
    });
  });

  it('verifies a reply by its own frozen rkey and keeps the cid as its anchor', async () => {
    const lookup = `${PDS}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(DID)}&collection=app.bsky.feed.post&rkey=${RKEY}`;
    const value = { $type: 'app.bsky.feed.post', text: 'Ďalej', createdAt: FROZEN.createdAt };
    const http = scriptedHttp([{ url: lookup, json: { uri: REPLY_URI, cid: 'cid-2', value } }]);
    const { ctx } = testPublishContext(http);
    if (blueskyRuntime.verify === undefined) throw new Error('bluesky verifies');
    expect(await blueskyRuntime.verify(ctx, input(reply('Ďalej'), [root, middle]))).toEqual({
      kind: 'found',
      remoteId: REPLY_URI,
      url: `https://bsky.app/profile/${DID}/post/${RKEY}`,
      anchor: { cid: 'cid-2' },
    });
  });

  it('refuses comments, reply media and replies without a usable parent', async () => {
    const permanent = (code: string) => ({ kind: 'permanent', code });
    expect(await rejected(reply('x', 1, 'comment'), [root])).toEqual(
      permanent('comment_unsupported'),
    );
    expect(await rejected({ ...reply('x'), media: [jpeg] }, [root, middle])).toEqual(
      permanent('reply_media_unsupported'),
    );
    expect(await rejected(reply('x'))).toEqual(permanent('reply_parent_missing'));
    expect(await rejected(reply('x'), [])).toEqual(permanent('reply_parent_missing'));
    const { anchor: _anchor, ...bare } = middle;
    expect(await rejected(reply('x'), [root, bare])).toEqual(permanent('reply_parent_missing'));
    expect(await rejected(reply('x'), [{ ...root, anchor: {} }, middle])).toEqual(
      permanent('reply_parent_missing'),
    );
    expect(await rejected(reply('x'), [middle])).toEqual(permanent('reply_parent_missing'));
  });

  it('applies the post text limits to a reply', async () => {
    expect(await rejected(reply('é'.repeat(301)), [root])).toEqual({
      kind: 'permanent',
      code: 'text_too_long',
    });
    expect(await rejected(reply(''), [root])).toEqual({ kind: 'permanent', code: 'text_empty' });
  });
});
