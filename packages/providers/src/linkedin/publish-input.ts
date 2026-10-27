import type { PublishInput, PublishItem } from '@kronaut/core';
import * as z from 'zod';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, planOf } from '../_kit/meta-input.ts';
import { type LinkedinSettings, linkedinManifest } from './manifest.ts';
import { authorUrn, memberId } from './oauth.ts';
import type { Member } from './rest.ts';
import type { LinkedinCredentials } from './runtime.ts';

export type Input = PublishInput<LinkedinCredentials, LinkedinSettings>;

export const imageUrn = z.string().regex(/^urn:li:image:[A-Za-z0-9_-]{1,128}$/);

const linkedinState = z.object({
  images: z.record(z.string(), imageUrn).optional(),
  sentAt: z.iso.datetime().optional(),
});
export type State = z.infer<typeof linkedinState>;

export function stateOf(value: unknown): State {
  const { success, data } = linkedinState.safeParse(value);
  if (success) return data;
  throw permanent('state_invalid');
}

export function memberOf(input: Input): Member {
  const sub = memberId.safeParse(input.account.providerAccountId);
  if (!sub.success) throw permanent('member_id_invalid');
  return { author: authorUrn(sub.data), token: input.credentials.accessToken };
}

export function checkInput(input: Input): PublishItem {
  const { item, spec } = planOf(linkedinManifest, input);
  const { media } = item;
  if (media.length === 0 && item.text.trim() === '') throw permanent('text_empty');
  const limits = spec.media;
  if (media.length > limits.maxCount) throw permanent('too_many_images');
  const ids = new Set(media.map((ref) => ref.id));
  if (ids.size < media.length) throw permanent('media_duplicate');
  const image = limits.image;
  if (image !== undefined) for (const ref of media) checkImageFile(image, ref);
  return item;
}
