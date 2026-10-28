import {
  type MediaRef,
  ProviderFailure,
  type PublishContext,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { failureFromBody, isSuccess, linkedinFailure, readBody } from './errors.ts';
import { escapeLittleText } from './escape.ts';
import { videoAsync } from './manifest.ts';
import {
  checkInput,
  type Input,
  imageUrn,
  memberOf,
  type State,
  stateOf,
} from './publish-input.ts';
import { type Member, restPost, uploadTarget } from './rest.ts';
import { uploadVideo, videoReady } from './video.ts';

const INIT_UPLOAD_PATH = '/rest/images?action=initializeUpload';
const POSTS_PATH = '/rest/posts';
const POST_URN = /^urn:li:(?:share|ugcPost):\d{1,32}$/;
const POST_URL = 'https://www.linkedin.com/feed/update/';

const initialized = z.looseObject({
  value: z.looseObject({ uploadUrl: z.string(), image: imageUrn }),
});

interface ImageEntry {
  readonly id: string;
  readonly altText?: string;
}

async function uploadImage(ctx: PublishContext, member: Member, ref: MediaRef): Promise<string> {
  const json = { initializeUploadRequest: { owner: member.author } };
  const init = await restPost(ctx, 'private', member, { path: INIT_UPLOAD_PATH, json });
  if (!isSuccess(init.status)) throw await linkedinFailure(init, 'private', ctx.now());
  const { value } = await readJson(init, initialized, 'private');
  const target = uploadTarget(value.uploadUrl);
  const bytes = await ctx.media.read(ref.id);
  const upload = await send(ctx, 'private', target, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${member.token}`, 'Content-Type': ref.mime },
    body: bytes,
  });
  if (!isSuccess(upload.status)) throw await linkedinFailure(upload, 'private', ctx.now());
  return value.image;
}

async function uploadImages(
  ctx: PublishContext,
  member: Member,
  item: PublishItem,
  initial: State,
): Promise<State> {
  await ctx.step('upload_images');
  let state = initial;
  for (const ref of item.media) {
    if (state.images?.[ref.id] !== undefined) continue;
    const urn = await uploadImage(ctx, member, ref);
    state = { ...state, images: { ...state.images, [ref.id]: urn } };
    await ctx.checkpoint(state);
  }
  return state;
}

function mediaEntry(ref: MediaRef, id: string): ImageEntry {
  const altText = ref.altText ?? '';
  return altText.trim() === '' ? { id } : { id, altText };
}

function imageEntry(ref: MediaRef, state: State): ImageEntry {
  const id = state.images?.[ref.id];
  if (id === undefined) throw new Error('image missing after upload');
  return mediaEntry(ref, id);
}

function contentOf(item: PublishItem, state: State): Record<string, unknown> {
  const [clip] = item.media;
  if (state.video !== undefined && clip !== undefined)
    return { content: { media: mediaEntry(clip, state.video) } };
  const images = item.media.map((ref) => imageEntry(ref, state));
  const [single] = images;
  if (single === undefined) return {};
  return images.length === 1
    ? { content: { media: single } }
    : { content: { multiImage: { images } } };
}

export function postBody(author: string, item: PublishItem, state: State): unknown {
  return {
    author,
    commentary: escapeLittleText(item.text),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    ...contentOf(item, state),
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}

interface Draft {
  readonly member: Member;
  readonly item: PublishItem;
  readonly state: State;
}

function checkVideoRejection(status: number, text: string): void {
  if (status !== 400) return;
  if (text.includes('MEDIA_ASSET_WAITING_UPLOAD'))
    throw new ProviderFailure({ kind: 'transient', detail: 'video_not_ready' });
  if (text.includes('MEDIA_ASSET_PROCESSING_FAILED')) throw permanent('video_processing_failed');
}

async function createPost(
  ctx: PublishContext,
  { member, item, state }: Draft,
  video: boolean,
): Promise<PublishOutcome> {
  await ctx.step('create_post');
  const sent: State = { ...state, sentAt: ctx.now().toString({ smallestUnit: 'millisecond' }) };
  await ctx.checkpoint(sent);
  const json = postBody(member.author, item, sent);
  const response = await restPost(ctx, 'public', member, { path: POSTS_PATH, json });
  if (!isSuccess(response.status)) {
    const text = await readBody(response);
    if (video) checkVideoRejection(response.status, text);
    throw failureFromBody(response.status, text, { effect: 'public', now: ctx.now() });
  }
  const urn = response.headers.get('x-restli-id') ?? '';
  if (!POST_URN.test(urn))
    throw new ProviderFailure({ kind: 'ambiguous', detail: 'post_urn_missing' });
  return { kind: 'published', remoteId: urn, url: `${POST_URL}${urn}` };
}

async function publishVideo(ctx: PublishContext, draft: Draft): Promise<PublishOutcome> {
  const { member, item } = draft;
  const [ref] = item.media;
  if (ref === undefined) throw new Error('video missing after input check');
  let { state } = draft;
  if (state.video === undefined) {
    await ctx.step('upload_video');
    state = await uploadVideo(ctx, member, ref, state);
    await ctx.checkpoint(state);
  }
  if (state.video === undefined) throw new Error('video missing after upload');
  if ((await videoReady(ctx, member, state.video)) === 'processing')
    return { kind: 'pending', pollAfterMs: videoAsync.pollIntervalMs };
  return createPost(ctx, { member, item, state }, true);
}

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const item = checkInput(input);
  const member = memberOf(input);
  const state = stateOf(input.state);
  if (input.postType === 'video') return publishVideo(ctx, { member, item, state });
  const uploaded = item.media.length > 0 ? await uploadImages(ctx, member, item, state) : state;
  return createPost(ctx, { member, item, state: uploaded }, false);
}
