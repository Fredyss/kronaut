import type { PublishContext, PublishItem, PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { itemPath } from '../_kit/items.ts';
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

const VIDEO_MIME = 'video/mp4';
const POST_TYPES: ReadonlySet<string> = new Set(['post', 'video']);

const pollAfterMs = (() => {
  const intervals = new Set(mastodonManifest.postTypes.map((type) => type.async?.pollIntervalMs));
  const [only] = intervals;
  if (intervals.size !== 1 || only === undefined)
    throw new Error('mastodon post types disagree on the poll interval');
  return only;
})();

const status = z.looseObject({ id: remoteId, url: z.string().nullish() });

function checkMedia(postType: string, media: PublishItem['media']): void {
  if (postType === 'video') {
    if (media.length !== 1) throw permanent('video_required');
    if (media[0]?.mime !== VIDEO_MIME) throw permanent('media_type_unsupported');
    return;
  }
  if (media.some((ref) => !ref.mime.startsWith('image/')))
    throw permanent('media_type_unsupported');
}

interface CheckedItem {
  readonly item: PublishItem;
  readonly inReplyTo?: string;
}

function checkItem(input: Input): CheckedItem {
  if (!POST_TYPES.has(input.postType)) throw permanent('post_type_unsupported');
  const path = itemPath(input);
  const { item } = path;
  if (path.kind === 'reply') {
    if (item.text.trim() === '') throw permanent('text_empty');
    if (!remoteId.safeParse(path.parent.remoteId).success) throw permanent('reply_parent_missing');
    return { item, inReplyTo: path.parent.remoteId };
  }
  if (input.postType === 'post' && item.text.trim() === '' && item.media.length === 0)
    throw permanent('text_empty');
  checkMedia(input.postType, item.media);
  return { item };
}

function statusForm({ item, inReplyTo }: CheckedItem, state: State): string {
  const form = new URLSearchParams({ status: item.text, visibility: 'public' });
  if (inReplyTo !== undefined) form.set('in_reply_to_id', inReplyTo);
  for (const id of mediaIds(item, state)) form.append('media_ids[]', id);
  const language = item.language?.split('-')[0]?.toLowerCase();
  if (language !== undefined && LANGUAGE.test(language)) form.set('language', language);
  return form.toString();
}

async function createStatus(
  ctx: PublishContext,
  input: Input,
  checked: CheckedItem,
  state: State,
): Promise<NonNullable<State['status']>> {
  const response = await send(ctx, 'public', endpoint(input, '/api/v1/statuses'), {
    method: 'POST',
    headers: {
      ...authorized(input),
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': idempotencyKey(input.destinationId, checked.item.position),
    },
    body: statusForm(checked, state),
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
  const checked = checkItem(input);
  const { item } = checked;
  const state = parseState(input.state);
  if (state.status !== undefined) return published(state.status);
  await ctx.step('upload_media');
  const uploaded = await uploadMedia(ctx, input, item, state);
  if (uploaded.kind === 'pending') return { kind: 'pending', pollAfterMs };
  await ctx.step('create_status');
  const sent = await save(ctx, {
    ...uploaded.state,
    sentAt: ctx.now().toString({ smallestUnit: 'millisecond' }),
  });
  const posted = await createStatus(ctx, input, checked, sent);
  await save(ctx, { ...sent, status: posted });
  return published(posted);
}
