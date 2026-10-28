import type { ChainLink, MediaRef, PublishInput, PublishItem } from '@kronaut/core';
import { type ItemPath, itemPath } from '../_kit/items.ts';
import { graphemeCount, utf8Length } from './facets.ts';
import { permanent } from './identity.ts';
import { type BlueskySettings, blueskyManifest } from './manifest.ts';
import type { BlueskyCredentials } from './runtime.ts';

export const POST_COLLECTION = 'app.bsky.feed.post';

export type Input = PublishInput<BlueskyCredentials, BlueskySettings>;

interface StrongRef {
  readonly uri: string;
  readonly cid: string;
}

export interface ReplyRefs {
  readonly root: StrongRef;
  readonly parent: StrongRef;
}

export interface CheckedItem {
  readonly item: PublishItem;
  readonly reply?: ReplyRefs;
}

export const spec = (() => {
  const post = blueskyManifest.postTypes.find((type) => type.id === 'post');
  if (post?.media.image === undefined) throw new Error('bluesky manifest lacks the post type');
  return { post, image: post.media.image };
})();

function limitOf(counting: 'graphemes' | 'utf8-bytes'): number {
  const limit = spec.post.text.find((entry) => entry.counting === counting);
  if (limit === undefined) throw new Error(`bluesky manifest lacks a ${counting} limit`);
  return limit.max;
}

function checkMedia(media: readonly MediaRef[]): void {
  if (media.length > spec.post.media.maxCount) throw permanent('too_many_images');
  for (const ref of media) {
    if (ref.mime.startsWith('video/') || ref.durationMs !== undefined)
      throw permanent('video_unsupported');
    if (!spec.image.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
    if (ref.bytes > spec.image.maxBytes) throw permanent('image_too_large');
  }
}

function strongRef(link: ChainLink | undefined): StrongRef {
  const cid = link?.anchor?.cid;
  if (link === undefined || !link.remoteId.startsWith('at://') || cid === undefined || cid === '')
    throw permanent('reply_parent_missing');
  return { uri: link.remoteId, cid };
}

function replyRefs(path: ItemPath): ReplyRefs | undefined {
  if (path.kind === 'main') return undefined;
  return {
    root: strongRef(path.chain.find((link) => link.position === 0)),
    parent: strongRef(path.parent),
  };
}

export function checkItem(input: Input): CheckedItem {
  if (input.postType !== spec.post.id) throw permanent('post_type_unsupported');
  const path = itemPath(input);
  const { item } = path;
  if (item.text === '' && item.media.length === 0) throw permanent('text_empty');
  if (graphemeCount(item.text) > limitOf('graphemes')) throw permanent('text_too_long');
  if (utf8Length(item.text) > limitOf('utf8-bytes')) throw permanent('text_too_many_bytes');
  checkMedia(item.media);
  const reply = replyRefs(path);
  return reply === undefined ? { item } : { item, reply };
}

export function postUrl(did: string, rkey: string): string {
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}
