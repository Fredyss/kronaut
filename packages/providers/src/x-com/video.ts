import { type MediaRef, ProviderFailure, type PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { multipart } from '../_kit/multipart.ts';
import { X_ID } from './connect.ts';
import { isSuccess, xFailure } from './errors.ts';
import { xManifest } from './manifest.ts';
import { API_BASE } from './oauth.ts';

export const CHUNK_BYTES = 4 * 1024 * 1024;
const MIN_POLL_MS = 5_000;
const MAX_POLL_MS = 60_000;

export type Processing =
  | { readonly kind: 'ready' }
  | { readonly kind: 'wait'; readonly pollAfterMs: number };

interface VideoUpload {
  readonly id: string;
  readonly expiresAfterSecs?: number;
  readonly processing: Processing;
}

const limits = (() => {
  const video = xManifest.postTypes[0]?.media.video;
  const polling = xManifest.postTypes[0]?.async;
  if (video === undefined || polling === undefined) throw new Error('x manifest lacks video');
  return { video, polling };
})();

const processingInfo = z
  .looseObject({
    state: z.string(),
    check_after_secs: z.number().int().nonnegative().optional(),
  })
  .optional();

const initialized = z.looseObject({
  data: z.looseObject({
    id: z.string().regex(X_ID),
    expires_after_secs: z.number().int().positive().optional(),
  }),
});

const finalized = z.looseObject({
  data: z.looseObject({
    expires_after_secs: z.number().int().positive().optional(),
    processing_info: processingInfo,
  }),
});

const status = z.looseObject({
  data: z.looseObject({ processing_info: processingInfo }),
});

export function isVideo(ref: MediaRef): boolean {
  return ref.mime.startsWith('video/') || ref.durationMs !== undefined;
}

export function checkVideo(ref: MediaRef): void {
  const { video } = limits;
  if (!video.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
  if (ref.bytes > video.maxBytes) throw permanent('video_too_large');
  const duration = ref.durationMs;
  if (duration !== undefined && (duration < video.minDurationMs || duration > video.maxDurationMs))
    throw permanent('video_duration_unsupported');
}

function processing(info: z.infer<typeof processingInfo>): Processing {
  if (info === undefined || info.state === 'succeeded') return { kind: 'ready' };
  if (info.state === 'failed') throw permanent('video_processing_failed');
  if (info.state !== 'pending' && info.state !== 'in_progress')
    throw new ProviderFailure({ kind: 'transient', detail: 'media_state_unknown' });
  const secs = info.check_after_secs;
  const pollAfterMs =
    secs === undefined
      ? limits.polling.pollIntervalMs
      : Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, secs * 1000));
  return { kind: 'wait', pollAfterMs };
}

function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

interface Body {
  readonly type: string;
  readonly body: string | Uint8Array;
}

async function post(ctx: PublishContext, token: string, path: string, content?: Body) {
  const response = await send(ctx, 'private', `${API_BASE}/media/upload${path}`, {
    method: 'POST',
    headers: {
      ...authorization(token),
      ...(content === undefined ? {} : { 'Content-Type': content.type }),
    },
    ...(content === undefined ? {} : { body: content.body }),
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'private', ctx.now());
  return response;
}

async function initialize(ctx: PublishContext, token: string, ref: MediaRef, size: number) {
  const body = JSON.stringify({
    media_type: ref.mime,
    total_bytes: size,
    media_category: 'tweet_video',
  });
  const response = await post(ctx, token, '/initialize', { type: 'application/json', body });
  return (await readJson(response, initialized, 'private')).data;
}

async function append(ctx: PublishContext, token: string, id: string, bytes: Uint8Array) {
  for (let index = 0; index * CHUNK_BYTES < bytes.byteLength; index += 1) {
    const chunk = bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    const part = multipart(
      { segment_index: String(index) },
      { name: 'media', filename: 'blob', mime: 'application/octet-stream', bytes: chunk },
    );
    await post(ctx, token, `/${id}/append`, part);
  }
}

export async function uploadVideo(
  ctx: PublishContext,
  token: string,
  ref: MediaRef,
): Promise<VideoUpload> {
  const bytes = await ctx.media.read(ref.id);
  if (bytes.byteLength > limits.video.maxBytes) throw permanent('video_too_large');
  const started = await initialize(ctx, token, ref, bytes.byteLength);
  await append(ctx, token, started.id, bytes);
  const response = await post(ctx, token, `/${started.id}/finalize`);
  const { data } = await readJson(response, finalized, 'private');
  const expiresAfterSecs = data.expires_after_secs ?? started.expires_after_secs;
  return {
    id: started.id,
    ...(expiresAfterSecs === undefined ? {} : { expiresAfterSecs }),
    processing: processing(data.processing_info),
  };
}

export async function videoStatus(
  ctx: PublishContext,
  token: string,
  id: string,
): Promise<Processing> {
  const url = `${API_BASE}/media/upload?command=STATUS&media_id=${id}`;
  const response = await send(ctx, 'private', url, { headers: authorization(token) });
  if (!isSuccess(response.status)) throw await xFailure(response, 'private', ctx.now());
  return processing((await readJson(response, status, 'private')).data.processing_info);
}
