import type { MediaRef, PublishInput } from '@kronaut/core';
import type { Plan } from '../_kit/meta-container-state.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, checkVideoFile, planOf } from '../_kit/meta-input.ts';
import { type ThreadsSettings, threadsManifest } from './manifest.ts';
import type { ThreadsCredentials } from './runtime.ts';

export type Input = PublishInput<ThreadsCredentials, ThreadsSettings>;

function checkImages(plan: Plan, media: readonly MediaRef[]): void {
  const limits = plan.spec.media;
  const image = limits.image;
  if (image === undefined) throw new Error('threads post lacks image limits');
  if (media.length > limits.maxCount) throw permanent('too_many_images');
  if (new Set(media.map((ref) => ref.id)).size !== media.length) throw permanent('media_duplicate');
  for (const ref of media) checkImageFile(image, ref);
}

function checkVideo(plan: Plan, media: readonly MediaRef[]): void {
  const { video, altText } = plan.spec.media;
  const [ref, ...rest] = media;
  if (video === undefined) throw new Error('threads video lacks video limits');
  if (ref === undefined || rest.length > 0) throw permanent('video_required');
  checkVideoFile(video, ref);
  if (ref.altText !== undefined && [...ref.altText].length > altText.maxLength)
    throw permanent('alt_text_too_long');
}

export function checkInput(input: Input): Plan {
  const plan = planOf(threadsManifest, input);
  const { item } = plan;
  if (plan.spec.id === 'video') {
    checkVideo(plan, item.media);
    return plan;
  }
  if (item.text.trim() === '' && item.media.length === 0) throw permanent('text_empty');
  checkImages(plan, item.media);
  return plan;
}

export function mediaTypeOf(
  postType: string,
  count: number,
): 'TEXT_POST' | 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO' {
  if (postType === 'video') return 'VIDEO';
  if (count === 0) return 'TEXT_POST';
  return count === 1 ? 'IMAGE' : 'CAROUSEL_ALBUM';
}
