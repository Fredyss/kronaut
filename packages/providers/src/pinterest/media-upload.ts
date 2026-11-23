import { type MediaRef, ProviderFailure, type PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { multipart } from '../_kit/multipart.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { API_BASE } from './oauth.ts';
import { type Input, mediaId } from './pin.ts';

const UPLOAD_HOST = 'pinterest-media-upload.s3-accelerate.amazonaws.com';

const registered = z.looseObject({
  media_id: mediaId,
  upload_url: z.string(),
  upload_parameters: z.record(z.string(), z.string()),
});
type Registered = z.infer<typeof registered>;

async function register(ctx: PublishContext, input: Input): Promise<Registered> {
  await ctx.step('register');
  const response = await send(ctx, 'private', `${API_BASE}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ media_type: 'video' }),
  });
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'private', now: ctx.now() });
  return readJson(response, registered, 'private');
}

function uploadTarget(value: string): URL {
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (url?.protocol !== 'https:' || url.hostname !== UPLOAD_HOST)
    throw permanent('upload_host_unexpected');
  return url;
}

async function upload(ctx: PublishContext, target: Registered, ref: MediaRef): Promise<void> {
  const url = uploadTarget(target.upload_url);
  await ctx.step('upload');
  const bytes = await ctx.media.read(ref.id);
  const file = { name: 'file', filename: 'video.mp4', mime: ref.mime, bytes };
  const { type, body } = multipart(target.upload_parameters, file);
  const response = await send(ctx, 'private', url, {
    method: 'POST',
    headers: { 'Content-Type': type },
    body,
  });
  if (!isSuccess(response.status))
    throw new ProviderFailure({ kind: 'transient', detail: `upload_http_${response.status}` });
}

export async function uploadVideo(
  ctx: PublishContext,
  input: Input,
  ref: MediaRef,
): Promise<string> {
  const target = await register(ctx, input);
  await ctx.checkpoint({ mediaId: target.media_id });
  await upload(ctx, target, ref);
  await ctx.checkpoint({ mediaId: target.media_id, uploaded: true });
  return target.media_id;
}
