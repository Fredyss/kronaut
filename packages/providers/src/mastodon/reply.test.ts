import type { ChainLink, ProviderState, PublishInput, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, TEST_NOW, testPublishContext } from '../_kit/testing.ts';
import type { MastodonSettings } from './manifest.ts';
import { mastodonManifest } from './manifest.ts';
import { idempotencyKey } from './publish-state.ts';
import { type MastodonCredentials, mastodonRuntime } from './runtime.ts';
import { cat, failureOf, form, input, ORIGIN, PUBLISHED, posts, SENT_AT } from './testing.ts';

const ROOT_ID = '113000000000000000';
const MIDDLE_ID = '113000000000000005';
const REPLY_ID = '113000000000000009';
const RECENT = `${ORIGIN}/api/v1/accounts/109876543210/statuses?limit=40&exclude_reblogs=true`;

const root: ChainLink = { position: 0, role: 'main', remoteId: ROOT_ID };
const middle: ChainLink = { position: 1, role: 'thread', remoteId: MIDDLE_ID };

function reply(text: string, position = 2, role: PublishItem['role'] = 'thread'): PublishItem {
  return { position, role, text, media: [] };
}

function chained(
  item: PublishItem,
  chain: readonly ChainLink[] | undefined,
  state: ProviderState = {},
  postType = 'post',
): PublishInput<MastodonCredentials, MastodonSettings> {
  return { ...input([item], state, 1, postType), ...(chain === undefined ? {} : { chain }) };
}

async function rejected(item: PublishItem, chain?: readonly ChainLink[]) {
  const http = scriptedHttp([]);
  const error = await failureOf(
    mastodonRuntime.publish(testPublishContext(http).ctx, chained(item, chain)),
  );
  expect(http.calls).toHaveLength(0);
  return error;
}

function status(id: string, inReplyTo: string | null) {
  return {
    id,
    created_at: TEST_NOW.add({ seconds: 30 }).toString(),
    url: `${ORIGIN}/@alice/${id}`,
    content: '<p>Pokračovanie</p>',
    media_attachments: [],
    in_reply_to_id: inReplyTo,
  };
}

describe('mastodon replies', () => {
  it('declares text-only reply chains on both api post types', () => {
    expect(mastodonManifest.postTypes.map((type) => [type.id, type.thread?.maxItems])).toEqual([
      ['post', 24],
      ['video', 24],
    ]);
    expect(mastodonManifest.postTypes.every((type) => type.thread?.media.maxCount === 0)).toBe(
      true,
    );
    expect(mastodonManifest.postTypes.every((type) => type.comment === undefined)).toBe(true);
  });

  it('posts a public reply to the last link with its own idempotency key', async () => {
    for (const postType of ['post', 'video']) {
      const http = scriptedHttp([posts()]);
      const result = await mastodonRuntime.publish(
        testPublishContext(http).ctx,
        chained(reply('Pokračovanie'), [root, middle], {}, postType),
      );
      http.assertDone();
      expect(result).toEqual(PUBLISHED);
      expect(form(http.calls[0])).toEqual([
        ['status', 'Pokračovanie'],
        ['visibility', 'public'],
        ['in_reply_to_id', MIDDLE_ID],
      ]);
      expect(http.calls[0]?.headers['idempotency-key']).toBe(idempotencyKey('dest-1', 2));
    }
  });

  it('refuses comments, reply media and replies without a usable parent', async () => {
    const permanent = (code: string) => ({ kind: 'permanent', code });
    expect(await rejected(reply('x', 1, 'comment'), [root])).toEqual(
      permanent('comment_unsupported'),
    );
    expect(await rejected({ ...reply('x'), media: [cat] }, [root, middle])).toEqual(
      permanent('reply_media_unsupported'),
    );
    expect(await rejected(reply('x'))).toEqual(permanent('reply_parent_missing'));
    expect(await rejected(reply('x'), [root, { ...middle, remoteId: '' }])).toEqual(
      permanent('reply_parent_missing'),
    );
    expect(await rejected(reply('x'), [root, { ...middle, remoteId: 'a/b' }])).toEqual(
      permanent('reply_parent_missing'),
    );
    expect(await rejected(reply('  '), [root])).toEqual(permanent('text_empty'));
  });

  it('verifies a reply by its text and parent from its own checkpoint', async () => {
    const run = async (statuses: unknown[]) => {
      const http = scriptedHttp([{ url: RECENT, json: statuses }]);
      const { ctx } = testPublishContext(http, {}, TEST_NOW.add({ minutes: 1 }));
      if (mastodonRuntime.verify === undefined) throw new Error('mastodon verifies');
      const outcome = await mastodonRuntime.verify(
        ctx,
        chained(reply('Pokračovanie'), [root, middle], { sentAt: SENT_AT }),
      );
      http.assertDone();
      return outcome;
    };
    expect(await run([status(REPLY_ID, MIDDLE_ID)])).toEqual({
      kind: 'found',
      remoteId: REPLY_ID,
      url: `${ORIGIN}/@alice/${REPLY_ID}`,
    });
    expect(await run([status(REPLY_ID, ROOT_ID), status('113000000000000010', null)])).toEqual({
      kind: 'absent',
    });
  });
});
