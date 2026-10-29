import type { PublishInput } from '@kronaut/core';
import * as z from 'zod';
import { graphId, type Plan } from '../_kit/meta-container-state.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, checkVideoFile, planOf } from '../_kit/meta-input.ts';
import { type FacebookSettings, facebookManifest } from './manifest.ts';
import { appSecret, appsecretProof, graphUrl } from './oauth.ts';
import type { FacebookCredentials } from './runtime.ts';

export type Input = PublishInput<FacebookCredentials, FacebookSettings>;

export interface PageAuth {
  readonly id: string;
  readonly token: string;
  readonly proof: string;
}

export const publishState = z.object({
  photos: z.record(z.string(), graphId).optional(),
  uploadedAt: z.iso.datetime().optional(),
  video: graphId.optional(),
  videoUploaded: z.literal(true).optional(),
  sentAt: z.iso.datetime().optional(),
});
export type State = z.infer<typeof publishState>;

export function parseState(state: unknown): State {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

export function pageOf(input: Pick<Input, 'account' | 'credentials' | 'app'>): PageAuth {
  const id = input.account.providerAccountId;
  if (!graphId.safeParse(id).success) throw permanent('page_id_invalid');
  const token = input.credentials.accessToken;
  return { id, token, proof: appsecretProof(appSecret(input.app.clientSecret), token) };
}

export function signedFields(page: PageAuth): Record<string, string> {
  return { access_token: page.token, appsecret_proof: page.proof };
}

export function readUrl(
  page: PageAuth,
  path: string,
  query: Readonly<Record<string, string>>,
): URL {
  return graphUrl(path, { ...query, ...signedFields(page) });
}

const REEL_MIN_WIDTH = 540;
const REEL_MIN_HEIGHT = 960;

function checkReel(plan: Plan): Plan {
  const { item, spec } = plan;
  const [ref, ...rest] = item.media;
  if (ref === undefined) throw permanent('video_required');
  if (rest.length > 0) throw permanent('too_many_images');
  const { video } = spec.media;
  if (video === undefined) throw permanent('media_type_unsupported');
  const { width, height } = ref;
  if (width !== undefined && height !== undefined) {
    if (width < REEL_MIN_WIDTH || height < REEL_MIN_HEIGHT) throw permanent('resolution_too_low');
  }
  checkVideoFile(video, ref);
  return plan;
}

function checkPost(plan: Plan): Plan {
  const { item, spec } = plan;
  if (item.text.trim() === '' && item.media.length === 0) throw permanent('text_empty');
  const { image, maxCount, altText } = spec.media;
  if (item.media.length > maxCount) throw permanent('too_many_images');
  if (new Set(item.media.map((ref) => ref.id)).size !== item.media.length)
    throw permanent('media_duplicate');
  for (const ref of item.media) {
    if (image === undefined) throw permanent('media_type_unsupported');
    checkImageFile(image, ref);
    if ((ref.altText?.length ?? 0) > altText.maxLength) throw permanent('alt_text_too_long');
  }
  return plan;
}

export function checkInput(input: Input): Plan {
  const plan = planOf(facebookManifest, input);
  return input.postType === 'reel' ? checkReel(plan) : checkPost(plan);
}
