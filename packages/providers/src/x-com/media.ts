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

const EXPIRY_MARGIN = Temporal.Duration.from({ minutes: 5 });

export const uploadedMedia = z.object({
  id: z.string().regex(X_ID),
  expiresAt: z.iso.datetime().optional(),
  alt: z.boolean(),
});
export type UploadedMedia = z.infer<typeof uploadedMedia>;

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

export function checkImages(media: readonly MediaRef[]): void {
  if (media.length > spec.media.maxCount) throw permanent('too_many_images');
  for (const ref of media) {
    if (ref.mime.startsWith('video/') || ref.durationMs !== undefined)
      throw permanent('video_unsupported');
    if (!spec.image.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
    if (ref.bytes > spec.image.maxBytes) throw permanent('image_too_large');
    if ((ref.altText?.normalize('NFC').length ?? 0) > spec.media.altText.maxLength)
      throw permanent('alt_text_too_long');
  }
}

export function usable(media: UploadedMedia | undefined, now: Temporal.Instant): boolean {
  if (media === undefined) return false;
  if (media.expiresAt === undefined) return true;
  const deadline = Temporal.Instant.from(media.expiresAt).subtract(EXPIRY_MARGIN);
  return Temporal.Instant.compare(now, deadline) < 0;
}

function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function uploadImage(
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
  const seconds = data.expires_after_secs;
  return {
    id: data.id,
    ...(seconds === undefined
      ? {}
      : { expiresAt: ctx.now().add({ seconds }).toString({ smallestUnit: 'millisecond' }) }),
    alt: false,
  };
}

export async function setAltText(
  ctx: PublishContext,
  token: string,
  mediaId: string,
  text: string,
): Promise<void> {
  const response = await send(ctx, 'private', `${API_BASE}/media/metadata`, {
    method: 'POST',
    headers: { ...authorization(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: mediaId, metadata: { alt_text: { text } } }),
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'private', ctx.now());
}
