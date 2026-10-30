import {
  isProviderFailure,
  type MediaRef,
  ProviderFailure,
  type PublishContext,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { graphId } from '../_kit/meta-container-state.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { graphBodyFailure, graphCall } from './graph.ts';
import { reelPolling } from './manifest.ts';
import { GRAPH_VERSION, graphUrl } from './oauth.ts';
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

const RUPLOAD_ORIGIN = 'https://rupload.facebook.com';
const FORM = 'application/x-www-form-urlencoded';
const FAILED_STATUSES = new Set(['error', 'upload_failed', 'expired']);
const UPLOAD_RETRY_ERRORS = ['OffsetInvalidError', 'PartialRequestError', 'ProcessingFailedError'];

const started = z.looseObject({ video_id: graphId });
const accepted = z.looseObject({ success: z.literal(true) });
const phase = z.looseObject({
  status: z.string().optional(),
  error: z.looseObject({ message: z.string().optional() }).nullish(),
});
const reelStatus = z.looseObject({
  status: z.looseObject({
    video_status: z.string(),
    uploading_phase: phase.optional(),
    processing_phase: phase.optional(),
    publishing_phase: phase.extend({ publish_status: z.string().optional() }).optional(),
  }),
});
type ReelStatus = z.infer<typeof reelStatus>['status'];

const pending: PublishOutcome = { kind: 'pending', pollAfterMs: reelPolling.pollIntervalMs };

function isDone(status: string | undefined): boolean {
  return status === 'completed' || status === 'complete';
}

function formInit(fields: Record<string, string>) {
  return {
    method: 'POST',
    headers: { 'content-type': FORM },
    body: new URLSearchParams(fields).toString(),
  };
}

async function startUpload(ctx: PublishContext, page: PageAuth): Promise<string> {
  const url = graphUrl(`${page.id}/video_reels`, {});
  const init = formInit({ upload_phase: 'start', ...signedFields(page) });
  return (await graphCall(ctx, 'private', { url, init }, started)).video_id;
}

async function pullUpload(
  ctx: PublishContext,
  page: PageAuth,
  upload: { readonly videoId: string; readonly ref: MediaRef },
): Promise<void> {
  const url = new URL(`/video-upload/${GRAPH_VERSION}/${upload.videoId}`, RUPLOAD_ORIGIN);
  const init = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `OAuth ${page.token}`,
      file_url: await ctx.media.signedUrl(upload.ref.id),
    },
  };
  const response = await send(ctx, 'private', url, init);
  if (response.status === 200) {
    await readJson(response, accepted, 'private');
    return;
  }
  const text = await response.text().catch(() => '');
  const retry = UPLOAD_RETRY_ERRORS.find((type) => text.includes(type));
  if (retry !== undefined) throw new ProviderFailure({ kind: 'transient', detail: retry });
  throw graphBodyFailure(ctx, response, { body: parseBody(text), effect: 'private' });
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function readStatus(
  ctx: PublishContext,
  page: PageAuth,
  videoId: string,
): Promise<ReelStatus> {
  const url = readUrl(page, videoId, { fields: 'status' });
  return (await graphCall(ctx, 'none', { url }, reelStatus)).status;
}

function firstError(status: ReelStatus): string | undefined {
  const { uploading_phase: up, processing_phase: proc, publishing_phase: pub } = status;
  return [up, proc, pub].map((entry) => entry?.error?.message).find((m) => m !== undefined);
}

function phaseFailed(status: ReelStatus): boolean {
  const { uploading_phase: up, processing_phase: proc, publishing_phase: pub } = status;
  return [up?.status, proc?.status, pub?.status].includes('error');
}

function checkUploadStatus(status: ReelStatus): void {
  if (status.video_status === 'expired') throw permanent('video_expired');
  const failed =
    status.video_status === 'upload_failed' ||
    status.video_status === 'error' ||
    status.uploading_phase?.status === 'error';
  if (failed) throw permanent('video_upload_failed', status.uploading_phase?.error?.message);
}

async function uploadSteps(
  ctx: PublishContext,
  page: PageAuth,
  ref: MediaRef,
  initial: State,
): Promise<State> {
  let state = initial;
  let stepped = false;
  if (state.video === undefined) {
    await ctx.step('upload_video');
    stepped = true;
    state = { ...state, video: await startUpload(ctx, page) };
    await ctx.checkpoint(state);
  }
  if (state.videoUploaded !== true && state.video !== undefined) {
    if (!stepped) await ctx.step('upload_video');
    await pullUpload(ctx, page, { videoId: state.video, ref });
    state = { ...state, videoUploaded: true };
    await ctx.checkpoint(state);
  }
  return state;
}

function finishFields(
  page: PageAuth,
  videoId: string,
  item: { readonly text: string; readonly ref: MediaRef },
): Record<string, string> {
  return {
    upload_phase: 'finish',
    video_id: videoId,
    video_state: 'PUBLISHED',
    ...(item.text.trim() === '' ? {} : { description: item.text }),
    ...(item.ref.aiGenerated ? { is_ai_generated: 'true' } : {}),
    ...signedFields(page),
  };
}

export async function publishReel(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const { item } = checkInput(input);
  const [ref] = item.media;
  if (ref === undefined) throw permanent('video_required');
  const page = pageOf(input);
  const state = await uploadSteps(ctx, page, ref, parseState(input.state));
  const { video } = state;
  if (video === undefined) throw permanent('state_invalid');
  const status = await readStatus(ctx, page, video);
  checkUploadStatus(status);
  if (!isDone(status.uploading_phase?.status)) return pending;
  await beginPublicSend(ctx, 'publish_reel', state);
  const url = graphUrl(`${page.id}/video_reels`, {});
  const init = formInit(finishFields(page, video, { text: item.text, ref }));
  await graphCall(ctx, 'public', { url, init }, accepted);
  return pending;
}

function publishedOutcome(videoId: string): { kind: 'published'; remoteId: string; url: string } {
  return { kind: 'published', remoteId: videoId, url: `https://www.facebook.com/${videoId}` };
}

export async function pollReel(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const { video } = parseState(input.state);
  if (video === undefined) throw permanent('state_invalid');
  const status = await readStatus(ctx, pageOf(input), video);
  if (status.publishing_phase?.publish_status === 'published') return publishedOutcome(video);
  const failed =
    FAILED_STATUSES.has(status.video_status) ||
    phaseFailed(status) ||
    status.publishing_phase?.publish_status === 'error';
  if (failed) throw permanent('reel_publish_failed', firstError(status));
  return pending;
}

export async function verifyReel(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const parsed = z.object({ video: graphId }).safeParse(input.state);
  if (!parsed.success) return { kind: 'inconclusive' };
  try {
    const status = await readStatus(ctx, pageOf(input), parsed.data.video);
    if (status.publishing_phase?.publish_status !== 'published') return { kind: 'inconclusive' };
    const { remoteId, url } = publishedOutcome(parsed.data.video);
    return { kind: 'found', remoteId, url };
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
