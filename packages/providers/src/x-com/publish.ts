import type { PublishContext, PublishInput, PublishItem, PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { itemPath } from '../_kit/items.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { X_ID } from './connect.ts';
import { isSuccess, xFailure } from './errors.ts';
import type { XSettings } from './manifest.ts';
import { checkMedia, prepareMedia, setAltText, uploadedMedia } from './media.ts';
import { API_BASE, type XCredentials } from './oauth.ts';

export type Input = PublishInput<XCredentials, XSettings>;

export const publishState = z.object({
  media: z.record(z.string(), uploadedMedia).optional(),
  sentAt: z.iso.datetime().optional(),
  post: z.object({ id: z.string().regex(X_ID) }).optional(),
});
type State = z.infer<typeof publishState>;

const created = z.looseObject({ data: z.looseObject({ id: z.string().regex(X_ID) }) });

interface CheckedItem {
  readonly item: PublishItem;
  readonly text: string;
  readonly inReplyTo?: string;
}

export function sentText(item: PublishItem): string {
  return item.text.normalize('NFC');
}

export function postUrl(input: Input, id: string): string | undefined {
  const handle = input.account.handle ?? '';
  return /^[A-Za-z0-9_]{1,50}$/.test(handle) ? `https://x.com/${handle}/status/${id}` : undefined;
}

function parseState(state: unknown): State {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

function checkItem(input: Input): CheckedItem {
  if (input.postType !== 'post') throw permanent('post_type_unsupported');
  const path = itemPath(input);
  const { item } = path;
  const text = sentText(item);
  if (text.trim() === '' && item.media.length === 0) throw permanent('text_empty');
  checkMedia(item.media);
  if (path.kind === 'main') return { item, text };
  if (text.trim() === '') throw permanent('text_empty');
  if (!X_ID.test(path.parent.remoteId)) throw permanent('reply_parent_missing');
  return { item, text, inReplyTo: path.parent.remoteId };
}

async function save(ctx: PublishContext, state: State): Promise<State> {
  await ctx.checkpoint(state);
  return state;
}

interface Uploaded {
  readonly state: State;
  readonly pollAfterMs?: number;
}

async function uploadAll(
  ctx: PublishContext,
  input: Input,
  { item }: CheckedItem,
  start: State,
): Promise<Uploaded> {
  let state = start;
  const token = input.credentials.accessToken;
  for (const ref of item.media) {
    const current = state.media?.[ref.id];
    const { media, pollAfterMs } = await prepareMedia(ctx, token, ref, current);
    if (media !== current)
      state = await save(ctx, { ...state, media: { ...state.media, [ref.id]: media } });
    if (pollAfterMs !== undefined) return { state, pollAfterMs };
    if (media.alt) continue;
    const alt = ref.altText?.normalize('NFC').trim() ?? '';
    if (alt !== '') await setAltText(ctx, token, media.id, alt);
    const done = { ...media, alt: true };
    state = await save(ctx, { ...state, media: { ...state.media, [ref.id]: done } });
  }
  return { state };
}

function postBody({ item, text, inReplyTo }: CheckedItem, state: State): string {
  const mediaIds = item.media.map((ref) => {
    const id = state.media?.[ref.id]?.id;
    if (id === undefined) throw new Error('media id missing after upload');
    return id;
  });
  return JSON.stringify({
    ...(text.trim() === '' ? {} : { text }),
    ...(mediaIds.length === 0 ? {} : { media: { media_ids: mediaIds } }),
    ...(inReplyTo === undefined ? {} : { reply: { in_reply_to_tweet_id: inReplyTo } }),
  });
}

function published(input: Input, id: string): PublishOutcome {
  const url = postUrl(input, id);
  return { kind: 'published', remoteId: id, ...(url === undefined ? {} : { url }) };
}

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const checked = checkItem(input);
  const state = parseState(input.state);
  if (state.post !== undefined) return published(input, state.post.id);
  await ctx.step('upload_media');
  const { state: uploaded, pollAfterMs } = await uploadAll(ctx, input, checked, state);
  if (pollAfterMs !== undefined) return { kind: 'pending', pollAfterMs };
  const body = postBody(checked, uploaded);
  const sent = await beginPublicSend(ctx, 'create_post', uploaded);
  const response = await send(ctx, 'public', `${API_BASE}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'public', ctx.now());
  const { id } = (await readJson(response, created, 'public')).data;
  await save(ctx, { ...sent, post: { id } });
  return published(input, id);
}
