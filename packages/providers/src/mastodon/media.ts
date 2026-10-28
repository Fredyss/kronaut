import type { MediaRef, PublishContext, PublishItem } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { type MultipartBody, multipart } from '../_kit/multipart.ts';
import { permanent } from './api.ts';
import {
  authorized,
  endpoint,
  failureOf,
  type Input,
  remoteId,
  type State,
  save,
} from './publish-state.ts';

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
};

const attachment = z.looseObject({ id: remoteId });

export type Uploaded =
  | { readonly kind: 'ready'; readonly state: State }
  | { readonly kind: 'pending' };

function uploadBody(ref: MediaRef, bytes: Uint8Array): MultipartBody {
  const extension = EXTENSIONS[ref.mime];
  if (extension === undefined) throw permanent('media_type_unsupported');
  const fields: Record<string, string> =
    ref.altText === undefined || ref.altText === '' ? {} : { description: ref.altText };
  return multipart(fields, {
    name: 'file',
    filename: `upload.${extension}`,
    mime: ref.mime,
    bytes,
  });
}

async function upload(
  ctx: PublishContext,
  input: Input,
  ref: MediaRef,
): Promise<{ id: string; ready: boolean }> {
  const { type, body } = uploadBody(ref, await ctx.media.read(ref.id));
  const response = await send(ctx, 'private', endpoint(input, '/api/v2/media'), {
    method: 'POST',
    headers: { ...authorized(input), 'content-type': type },
    body,
  });
  if (response.status !== 200 && response.status !== 202)
    throw failureOf(ctx, response, 'private', 'media_invalid');
  const { id } = await readJson(response, attachment, 'private');
  return { id, ready: response.status === 200 };
}

async function processed(ctx: PublishContext, input: Input, id: string): Promise<boolean> {
  const response = await send(ctx, 'private', endpoint(input, `/api/v1/media/${id}`), {
    headers: authorized(input),
  });
  if (response.status === 206) return false;
  if (response.status === 404) throw permanent('media_missing');
  if (response.status !== 200) throw failureOf(ctx, response, 'private', 'media_rejected');
  await readJson(response, attachment, 'private');
  return true;
}

export async function uploadMedia(
  ctx: PublishContext,
  input: Input,
  item: PublishItem,
  initial: State,
): Promise<Uploaded> {
  let state = initial;
  for (const ref of item.media) {
    if (state.media?.[ref.id] !== undefined) continue;
    const media = await upload(ctx, input, ref);
    state = await save(ctx, { ...state, media: { ...state.media, [ref.id]: media } });
  }
  for (const ref of item.media) {
    const media = state.media?.[ref.id];
    if (media === undefined || media.ready) continue;
    if (!(await processed(ctx, input, media.id))) return { kind: 'pending' };
    state = await save(ctx, {
      ...state,
      media: { ...state.media, [ref.id]: { ...media, ready: true } },
    });
  }
  return { kind: 'ready', state };
}

export function mediaIds(item: PublishItem, state: State): string[] {
  return item.media.map((ref) => {
    const media = state.media?.[ref.id];
    if (media === undefined) throw new Error('media missing after upload');
    return media.id;
  });
}
