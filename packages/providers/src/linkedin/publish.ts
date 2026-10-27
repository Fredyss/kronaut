import {
  type MediaRef,
  ProviderFailure,
  type PublishContext,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { isSuccess, linkedinFailure } from './errors.ts';
import { escapeLittleText } from './escape.ts';
import {
  checkInput,
  type Input,
  imageUrn,
  memberOf,
  type State,
  stateOf,
} from './publish-input.ts';
import { type Member, restPost, uploadTarget } from './rest.ts';

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

function imageEntry(ref: MediaRef, state: State): ImageEntry {
  const id = state.images?.[ref.id];
  if (id === undefined) throw new Error('image missing after upload');
  const altText = ref.altText ?? '';
  return altText.trim() === '' ? { id } : { id, altText };
}

function contentOf(item: PublishItem, state: State): Record<string, unknown> {
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

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const item = checkInput(input);
  const member = memberOf(input);
  let state = stateOf(input.state);
  if (item.media.length > 0) state = await uploadImages(ctx, member, item, state);
  await ctx.step('create_post');
  const sent: State = { ...state, sentAt: ctx.now().toString({ smallestUnit: 'millisecond' }) };
  await ctx.checkpoint(sent);
  const json = postBody(member.author, item, sent);
  const response = await restPost(ctx, 'public', member, { path: POSTS_PATH, json });
  if (!isSuccess(response.status)) throw await linkedinFailure(response, 'public', ctx.now());
  const urn = response.headers.get('x-restli-id') ?? '';
  if (!POST_URN.test(urn))
    throw new ProviderFailure({ kind: 'ambiguous', detail: 'post_urn_missing' });
  return { kind: 'published', remoteId: urn, url: `${POST_URL}${urn}` };
}
