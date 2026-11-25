import type { MediaRef, PublishContext } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { multipart } from '../_kit/multipart.ts';
import { X_ID } from './connect.ts';
import { isSuccess, xFailure } from './errors.ts';
import { xManifest } from './manifest.ts';
import { API_BASE } from './oauth.ts';
import { checkVideo, isVideo, type Processing, uploadVideo, videoStatus } from './video.ts';

const EXPIRY_MARGIN = Temporal.Duration.from({ minutes: 5 });
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export const uploadedMedia = z.object({
  id: z.string().regex(X_ID),
  expiresAt: z.iso.datetime().optional(),
  alt: z.boolean(),
  processing: z.literal(true).optional(),
});
export type UploadedMedia = z.infer<typeof uploadedMedia>;

export interface Prepared {
  readonly media: UploadedMedia;
  readonly pollAfterMs?: number;
}

const uploadResponse = z.looseObject({
  data: z.looseObject({
    id: z.string().regex(X_ID),
    expires_after_secs: z.number().int().positive().optional(),
  }),
});

const spec = (() => {
  const image = xManifest.postTypes[0]?.media.image;
  const media = xManifest.postTypes[0]?.media;
  if (image === undefined || media === undefined) throw new Error('x manifest lacks images');
  return { image, media };
})();

function graphemeCount(text: string): number {
  return [...graphemes.segment(text.normalize('NFC'))].length;
}

function checkImage(ref: MediaRef): void {
  if (!spec.image.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
  if (ref.bytes > spec.image.maxBytes) throw permanent('image_too_large');
}

export function checkMedia(media: readonly MediaRef[]): void {
  const videos = media.filter(isVideo).length;
  if (videos > 0 && media.length > 1)
    throw permanent(videos === media.length ? 'too_many_videos' : 'media_mixed');
  if (media.length > spec.media.maxCount) throw permanent('too_many_images');
  for (const ref of media) {
    if (isVideo(ref)) checkVideo(ref);
    else checkImage(ref);
    if (graphemeCount(ref.altText ?? '') > spec.media.altText.maxLength)
      throw permanent('alt_text_too_long');
  }
}

function usable(media: UploadedMedia, now: Temporal.Instant): boolean {
  if (media.expiresAt === undefined) return true;
  const deadline = Temporal.Instant.from(media.expiresAt).subtract(EXPIRY_MARGIN);
  return Temporal.Instant.compare(now, deadline) < 0;
}

function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function expiry(ctx: PublishContext, seconds: number | undefined): { expiresAt?: string } {
  if (seconds === undefined) return {};
  return { expiresAt: ctx.now().add({ seconds }).toString({ smallestUnit: 'millisecond' }) };
}

async function uploadImage(
  ctx: PublishContext,
  token: string,
  ref: MediaRef,
): Promise<UploadedMedia> {
  const bytes = await ctx.media.read(ref.id);
  if (bytes.byteLength > spec.image.maxBytes) throw permanent('image_too_large');
  const { type, body } = multipart(
    { media_category: 'tweet_image' },
    { name: 'media', filename: 'image', mime: ref.mime, bytes },
  );
  const response = await send(ctx, 'private', `${API_BASE}/media/upload`, {
    method: 'POST',
    headers: { ...authorization(token), 'Content-Type': type },
    body,
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'private', ctx.now());
  const { data } = await readJson(response, uploadResponse, 'private');
  return { id: data.id, ...expiry(ctx, data.expires_after_secs), alt: false };
}

function settle(media: UploadedMedia, processing: Processing): Prepared {
  const { id, expiresAt, alt } = media;
  const base = { id, ...(expiresAt === undefined ? {} : { expiresAt }), alt };
  if (processing.kind === 'wait') {
    const waiting = media.processing === true ? media : { ...base, processing: true as const };
    return { media: waiting, pollAfterMs: processing.pollAfterMs };
  }
  return { media: media.processing === true ? base : media };
}

export async function prepareMedia(
  ctx: PublishContext,
  token: string,
  ref: MediaRef,
  current: UploadedMedia | undefined,
): Promise<Prepared> {
  if (current !== undefined && usable(current, ctx.now())) {
    if (current.processing !== true) return { media: current };
    return settle(current, await videoStatus(ctx, token, current.id));
  }
  if (!isVideo(ref)) return { media: await uploadImage(ctx, token, ref) };
  const upload = await uploadVideo(ctx, token, ref);
  const media = { id: upload.id, ...expiry(ctx, upload.expiresAfterSecs), alt: false };
  return settle(media, upload.processing);
}

function refused(status: number): boolean {
  return status === 400 || status === 422;
}

export async function setAltText(
  ctx: PublishContext,
  token: string,
  mediaId: string,
  ref: MediaRef,
): Promise<void> {
  const text = ref.altText?.normalize('NFC').trim() ?? '';
  if (text === '') return;
  const response = await send(ctx, 'private', `${API_BASE}/media/metadata`, {
    method: 'POST',
    headers: { ...authorization(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: mediaId, metadata: { alt_text: { text } } }),
  });
  if (isSuccess(response.status)) return;
  if (isVideo(ref) && refused(response.status)) {
    ctx.logger.warn({ status: response.status }, 'x refused alt text on a video; posting without');
    return;
  }
  throw await xFailure(response, 'private', ctx.now());
}
