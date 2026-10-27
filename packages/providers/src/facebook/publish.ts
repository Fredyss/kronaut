import {
  isProviderFailure,
  type MediaRef,
  type PublishContext,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { graphId } from '../_kit/meta-container-state.ts';
import { multipart } from '../_kit/multipart.ts';
import { graphCall } from './graph.ts';
import { graphUrl } from './oauth.ts';
import {
  checkInput,
  type Input,
  type PageAuth,
  pageOf,
  parseState,
  readUrl,
  type State,
  signedFields,
} from './publish-input.ts';

const PHOTO_REUSE = Temporal.Duration.from({ hours: 20 });
const EXTENSIONS: Readonly<Record<string, string>> = { 'image/jpeg': 'jpg', 'image/png': 'png' };

export const postId = z.string().regex(/^\d{1,32}_\d{1,32}$/);
const uploaded = z.looseObject({ id: graphId });
const created = z.looseObject({ id: postId });
const permalink = z.looseObject({ permalink_url: z.string().optional() });

function stamp(ctx: PublishContext): string {
  return ctx.now().toString({ smallestUnit: 'millisecond' });
}

export function postUrl(id: string, permalinkUrl: string | null | undefined): string {
  if (typeof permalinkUrl === 'string' && URL.canParse(permalinkUrl)) {
    if (new URL(permalinkUrl).protocol === 'https:') return permalinkUrl;
  }
  return `https://www.facebook.com/${id}`;
}

function reusable(ctx: PublishContext, state: State): State {
  if (state.uploadedAt === undefined) return state;
  const reuseUntil = Temporal.Instant.from(state.uploadedAt).add(PHOTO_REUSE);
  if (Temporal.Instant.compare(ctx.now(), reuseUntil) < 0) return state;
  const { photos: _photos, uploadedAt: _uploadedAt, ...rest } = state;
  return rest;
}

async function uploadPhoto(ctx: PublishContext, page: PageAuth, ref: MediaRef): Promise<string> {
  const bytes = await ctx.media.read(ref.id);
  const altText = ref.altText ?? '';
  const described = altText.trim() === '' ? {} : { alt_text_custom: altText };
  const fields = { ...signedFields(page), published: 'false', ...described };
  const file = {
    name: 'source',
    filename: `upload.${EXTENSIONS[ref.mime] ?? 'jpg'}`,
    mime: ref.mime,
  };
  const { type, body } = multipart(fields, { ...file, bytes });
  const url = graphUrl(`${page.id}/photos`, {});
  const init = { method: 'POST', headers: { 'content-type': type }, body };
  return (await graphCall(ctx, 'private', { url, init }, uploaded)).id;
}

async function uploadPhotos(
  ctx: PublishContext,
  page: PageAuth,
  item: PublishItem,
  initial: State,
): Promise<State> {
  await ctx.step('upload_photos');
  let state = reusable(ctx, initial);
  for (const ref of item.media) {
    if (state.photos?.[ref.id] !== undefined) continue;
    const uploadedAt = state.uploadedAt ?? stamp(ctx);
    const id = await uploadPhoto(ctx, page, ref);
    state = { ...state, photos: { ...state.photos, [ref.id]: id }, uploadedAt };
    await ctx.checkpoint(state);
  }
  return state;
}

function feedForm(page: PageAuth, item: PublishItem, state: State): Record<string, string> {
  const form: Record<string, string> = item.text.trim() === '' ? {} : { message: item.text };
  item.media.forEach((ref, index) => {
    const id = state.photos?.[ref.id];
    if (id === undefined) throw new Error('photo missing after upload');
    form[`attached_media[${index}]`] = JSON.stringify({ media_fbid: id });
  });
  return { ...form, ...signedFields(page) };
}

async function permalinkOf(ctx: PublishContext, page: PageAuth, id: string): Promise<string> {
  const url = readUrl(page, id, { fields: 'id,permalink_url' });
  const read = await graphCall(ctx, 'none', { url }, permalink).catch((error: unknown) => {
    if (isProviderFailure(error)) return undefined;
    throw error;
  });
  return postUrl(id, read?.permalink_url);
}

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const { item } = checkInput(input);
  const page = pageOf(input);
  let state = parseState(input.state);
  if (item.media.length > 0) state = await uploadPhotos(ctx, page, item, state);
  await ctx.step('create_post');
  const sent: State = { ...state, sentAt: stamp(ctx) };
  await ctx.checkpoint(sent);
  const form = feedForm(page, item, sent);
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  };
  const url = graphUrl(`${page.id}/feed`, {});
  const { id } = await graphCall(ctx, 'public', { url, init }, created);
  return { kind: 'published', remoteId: id, url: await permalinkOf(ctx, page, id) };
}
