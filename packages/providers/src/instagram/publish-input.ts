import type { ImageLimits, MediaLimits, MediaRef, PostTypeSpec, PublishInput } from '@kronaut/core';
import type { Plan } from '../_kit/meta-container-state.ts';
import { checkImageFile, planOf } from '../_kit/meta-input.ts';
import { type InstagramSettings, instagramManifest } from './manifest.ts';
import { permanent } from './oauth.ts';
import type { InstagramCredentials } from './runtime.ts';

export type Input = PublishInput<InstagramCredentials, InstagramSettings>;

const HASHTAG = /(?<=^|\s)#(?=\S)/gu;
const MENTION = /(?<=^|\s)@(?=\S)/gu;
const MAX_HASHTAGS = 30;
const MAX_MENTIONS = 20;

function countTokens(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function checkAspect(image: ImageLimits, ref: MediaRef): void {
  const { width, height } = ref;
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    const { minAspect: min, maxAspect: max } = image;
    if (min !== undefined && width * min.height < height * min.width)
      throw permanent('aspect_ratio_unsupported');
    if (max !== undefined && width * max.height > height * max.width)
      throw permanent('aspect_ratio_unsupported');
  }
}

function checkImage(limits: MediaLimits, image: ImageLimits, ref: MediaRef): void {
  checkImageFile(image, ref);
  checkAspect(image, ref);
  if (ref.altText !== undefined && ref.altText.length > limits.altText.maxLength)
    throw permanent('alt_text_too_long');
}

function checkMedia(spec: PostTypeSpec, media: readonly MediaRef[]): void {
  const limits = spec.media;
  const image = limits.image;
  if (image === undefined) throw new Error(`instagram ${spec.id} lacks image limits`);
  if (media.length < limits.minCount) throw permanent('too_few_images');
  if (media.length > limits.maxCount) throw permanent('too_many_images');
  if (new Set(media.map((ref) => ref.id)).size !== media.length) throw permanent('media_duplicate');
  for (const ref of media) checkImage(limits, image, ref);
}

function checkCaption(spec: PostTypeSpec, text: string): void {
  for (const limit of spec.text) {
    if (limit.counting !== 'utf16') throw new Error(`instagram counts ${limit.counting}`);
    if (text.length > limit.max) throw permanent('caption_too_long');
  }
  if (countTokens(text, HASHTAG) > MAX_HASHTAGS) throw permanent('too_many_hashtags');
  if (countTokens(text, MENTION) > MAX_MENTIONS) throw permanent('too_many_mentions');
}

export function checkInput(input: Input): Plan {
  const plan = planOf(instagramManifest, input);
  checkMedia(plan.spec, plan.item.media);
  checkCaption(plan.spec, plan.item.text);
  return plan;
}
