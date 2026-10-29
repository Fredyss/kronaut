import type { ChainLink, ProviderState, PublishInput, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, TEST_NOW, testPublishContext } from '../_kit/testing.ts';
import { accountCapabilities, accountPostType } from './capabilities.ts';
import { type ThreadsSettings, threadsManifest } from './manifest.ts';
import { type ThreadsCredentials, threadsRuntime } from './runtime.ts';
import {
  CONTAINER,
  createdAs,
  failureOf,
  form,
  input,
  PERMALINK,
  POST_ID,
  permalink,
  png,
  publishes,
  SENT_AT,
  status,
} from './testing.ts';

const ROOT_ID = '18050000000000001';
const MIDDLE_ID = '18050000000000005';
const SCOPES = ['threads_basic', 'threads_content_publish', 'threads_manage_replies'];

const root: ChainLink = { position: 0, role: 'main', remoteId: ROOT_ID };
const middle: ChainLink = { position: 1, role: 'thread', remoteId: MIDDLE_ID };

function reply(text: string, position = 2, role: PublishItem['role'] = 'thread'): PublishItem {
  return { position, role, text, media: [] };
}

function chained(
  item: PublishItem,
  chain: readonly ChainLink[] | undefined,
  { state = {}, postType = 'post', scopes = SCOPES }: Chained = {},
): PublishInput<ThreadsCredentials, ThreadsSettings> {
  const base = input([item], state, postType);
  return {
    ...base,
    credentials: { ...base.credentials, scopes: [...scopes] },
    ...(chain === undefined ? {} : { chain }),
  };
}

interface Chained {
  readonly state?: ProviderState;
  readonly postType?: string;
  readonly scopes?: readonly string[];
}

async function rejected(item: PublishItem, chain?: readonly ChainLink[], options?: Chained) {
  const http = scriptedHttp([]);
  const error = await failureOf(
    threadsRuntime.publish(testPublishContext(http).ctx, chained(item, chain, options)),
  );
  expect(http.calls).toHaveLength(0);
  return error;
}

function verify(state: ProviderState, exchanges: Parameters<typeof scriptedHttp>[0]) {
  const http = scriptedHttp(exchanges);
  const { ctx } = testPublishContext(http, {}, TEST_NOW.add({ minutes: 5 }));
  if (threadsRuntime.verify === undefined) throw new Error('threads verifies');
  return {
    http,
    outcome: threadsRuntime.verify(ctx, chained(reply('Ďalej'), [root, middle], { state })),
  };
}

describe('threads replies: manifest and capabilities', () => {
  const [post, video] = threadsManifest.postTypes;
  if (post === undefined || video === undefined) throw new Error('threads post types missing');

  it('declares text-only reply chains on both api post types and no comments', () => {
    expect(threadsManifest.postTypes.map((type) => [type.id, type.thread?.maxItems])).toEqual([
      ['post', 24],
      ['video', 24],
    ]);
    expect(post.thread?.media.maxCount).toBe(0);
    expect(threadsManifest.postTypes.every((type) => type.comment === undefined)).toBe(true);
  });

  it('offers replies only to accounts connected with the replies scope', () => {
    expect(accountCapabilities(SCOPES)).toEqual({ replies: true, insights: false });
    expect(accountCapabilities([...SCOPES, 'threads_manage_insights'])).toEqual({
      replies: true,
      insights: true,
    });
    expect(accountCapabilities(SCOPES.slice(0, 2))).toEqual({ replies: false, insights: false });
    for (const type of [post, video]) {
      expect(accountPostType(type, { replies: true })).toEqual(type);
      const { thread: _thread, ...plain } = type;
      for (const capabilities of [undefined, null, {}, { replies: false }, { replies: 'yes' }])
        expect(accountPostType(type, capabilities)).toEqual(plain);
    }
    expect(threadsManifest.accountPostType).toBe(accountPostType);
  });
});

describe('threads replies: publish', () => {
  it('creates a TEXT container that replies to the last link on either post type', async () => {
    for (const postType of ['post', 'video']) {
      const http = scriptedHttp([createdAs(CONTAINER)]);
      const run = testPublishContext(http);
      const result = await threadsRuntime.publish(
        run.ctx,
        chained(reply('Pokračovanie'), [root, middle], { postType }),
      );
      http.assertDone();
      expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
      expect(form(http.calls[0])).toEqual({
        media_type: 'TEXT',
        text: 'Pokračovanie',
        reply_to_id: MIDDLE_ID,
      });
      expect(run.checkpoints).toEqual([{ container: CONTAINER }]);
    }
  });

  it('publishes the reply container from its own state and reads the permalink', async () => {
    const http = scriptedHttp([status(CONTAINER, 'FINISHED'), publishes(), permalink()]);
    const run = testPublishContext(http);
    const result = await threadsRuntime.publish(
      run.ctx,
      chained(reply('Pokračovanie'), [root, middle], { state: { container: CONTAINER } }),
    );
    http.assertDone();
    expect(result).toEqual({ kind: 'published', remoteId: POST_ID, url: PERMALINK });
    expect(form(http.calls[1])).toEqual({ creation_id: CONTAINER });
  });

  it('refuses comments, reply media, missing parents and a missing replies scope', async () => {
    const permanent = (code: string) => ({ kind: 'permanent', code });
    expect(await rejected(reply('x', 1, 'comment'), [root])).toEqual(
      permanent('comment_unsupported'),
    );
    expect(await rejected({ ...reply('x'), media: [png] }, [root, middle])).toEqual(
      permanent('reply_media_unsupported'),
    );
    expect(await rejected(reply('x'))).toEqual(permanent('reply_parent_missing'));
    expect(await rejected(reply('x'), [root, { ...middle, remoteId: 'abc' }])).toEqual(
      permanent('reply_parent_missing'),
    );
    expect(await rejected(reply(' '), [root])).toEqual(permanent('text_empty'));
    expect(await rejected(reply('x'), [root], { scopes: SCOPES.slice(0, 2) })).toEqual(
      permanent('replies_permission_missing'),
    );
  });
});

describe('threads replies: verify', () => {
  it('stays inconclusive for a published reply instead of matching recent posts', async () => {
    const { http, outcome } = verify({ container: CONTAINER, sentAt: SENT_AT }, [
      status(CONTAINER, 'PUBLISHED'),
    ]);
    expect(await outcome).toEqual({ kind: 'inconclusive' });
    http.assertDone();
  });

  it('reads the reply container from its own state for an absent outcome', async () => {
    const { http, outcome } = verify({ container: CONTAINER, sentAt: SENT_AT }, [
      status(CONTAINER, 'ERROR'),
    ]);
    expect(await outcome).toEqual({ kind: 'absent' });
    http.assertDone();
  });
});
