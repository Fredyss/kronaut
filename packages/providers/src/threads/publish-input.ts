import type { MediaRef, PublishInput } from '@kronaut/core';
import { itemPath } from '../_kit/items.ts';
import { graphId, type Plan } from '../_kit/meta-container-state.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, checkVideoFile } from '../_kit/meta-input.ts';
import { REPLIES_SCOPE } from './capabilities.ts';
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

export function replyToId(input: Input): string | undefined {
  const path = itemPath(input);
  if (path.kind === 'main') return undefined;
  if (!graphId.safeParse(path.parent.remoteId).success) throw permanent('reply_parent_missing');
  return path.parent.remoteId;
}

export function checkInput(input: Input): Plan {
  const spec = threadsManifest.postTypes.find((type) => type.id === input.postType);
  if (spec === undefined) throw permanent('post_type_unsupported');
  const { item } = itemPath(input);
  const plan = { spec, item };
  if (replyToId(input) !== undefined) {
    if (item.text.trim() === '') throw permanent('text_empty');
    if (!input.credentials.scopes.includes(REPLIES_SCOPE))
      throw permanent('replies_permission_missing');
    return plan;
  }
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
