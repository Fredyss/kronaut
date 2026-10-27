import type { PublishContext, PublishItem, PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from './api.ts';
import { httpsUrl } from './connect.ts';
import { mastodonManifest } from './manifest.ts';
import { mediaIds, uploadMedia } from './media.ts';
import {
  authorized,
  endpoint,
  failureOf,
  type Input,
  idempotencyKey,
  parseState,
  remoteId,
  type State,
  save,
} from './publish-state.ts';

const LANGUAGE = /^[a-z]{2,3}$/;

const postType = (() => {
  const post = mastodonManifest.postTypes.find((type) => type.id === 'post');
  if (post?.async === undefined) throw new Error('mastodon manifest lacks the post type');
  return { id: post.id, pollAfterMs: post.async.pollIntervalMs };
})();

const status = z.looseObject({ id: remoteId, url: z.string().nullish() });

export function mainItem(input: Input): PublishItem {
  if (input.postType !== postType.id) throw permanent('post_type_unsupported');
  if (input.items.some((item) => item.role !== 'main')) throw permanent('thread_unsupported');
  const [main, ...rest] = input.items;
  if (main === undefined) throw permanent('main_item_missing');
  if (rest.length > 0) throw permanent('main_item_multiple');
  if (main.text.trim() === '' && main.media.length === 0) throw permanent('text_empty');
  if (main.media.some((ref) => !ref.mime.startsWith('image/')))
    throw permanent('media_type_unsupported');
  return main;
}

function statusForm(item: PublishItem, state: State): string {
  const form = new URLSearchParams({ status: item.text, visibility: 'public' });
  for (const id of mediaIds(item, state)) form.append('media_ids[]', id);
  const language = item.language?.split('-')[0]?.toLowerCase();
  if (language !== undefined && LANGUAGE.test(language)) form.set('language', language);
  return form.toString();
}

async function createStatus(
  ctx: PublishContext,
  input: Input,
  item: PublishItem,
  state: State,
): Promise<NonNullable<State['status']>> {
  const response = await send(ctx, 'public', endpoint(input, '/api/v1/statuses'), {
    method: 'POST',
    headers: {
      ...authorized(input),
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': idempotencyKey(input.destinationId, item.position),
    },
    body: statusForm(item, state),
  });
  if (response.status !== 200) throw failureOf(ctx, response, 'public', 'status_invalid');
  const { id, url } = await readJson(response, status, 'public');
  const link = httpsUrl(url);
  return link === undefined ? { id } : { id, url: link };
}

function published(posted: NonNullable<State['status']>): PublishOutcome {
  return {
    kind: 'published',
    remoteId: posted.id,
    ...(posted.url === undefined ? {} : { url: posted.url }),
  };
}

export async function publishStatus(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const item = mainItem(input);
  const state = parseState(input.state);
  if (state.status !== undefined) return published(state.status);
  await ctx.step('upload_media');
  const uploaded = await uploadMedia(ctx, input, item, state);
  if (uploaded.kind === 'pending') return { kind: 'pending', pollAfterMs: postType.pollAfterMs };
  await ctx.step('create_status');
  const sent = await save(ctx, {
    ...uploaded.state,
    sentAt: ctx.now().toString({ smallestUnit: 'millisecond' }),
  });
  const posted = await createStatus(ctx, input, item, sent);
  await save(ctx, { ...sent, status: posted });
  return published(posted);
}
