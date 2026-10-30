import type { Channel, Post } from '../api.ts';
import type { MediaAsset } from '../post-actions/post-media.ts';
import { choiceFor } from './choice.ts';
import { type Content, type Contents, effective, type PickedImage } from './contents.ts';
import { toDoc } from './doc.ts';
import { isPlainDoc } from './plain-doc.ts';
import type { VideoEntry, VideoRegistry } from './use-video.ts';
import { upcoming, type WhenStart } from './when.ts';

export type Refusal =
  | 'channel_unavailable'
  | 'channel_twice'
  | 'reply_media'
  | 'mixed_media'
  | 'many_videos'
  | 'repeated_media'
  | 'media_unavailable'
  | 'item_order'
  | 'publish_type'
  | 'rich_content';

export interface OpenedForm {
  readonly contents: Contents;
  readonly selected: ReadonlySet<string>;
  readonly videos: VideoRegistry;
  readonly when: WhenStart;
}

export type FromPost =
  | { readonly ok: true; readonly form: OpenedForm }
  | { readonly ok: false; readonly reason: Refusal };

type Item = Post['items'][number];
type Media = Item['media'][number];
type Assets = ReadonlyMap<string, MediaAsset>;
type KnownAsset = MediaAsset & { readonly bytes: number; readonly mime: string };

function isKnown(asset: MediaAsset | undefined): asset is KnownAsset {
  if (asset === undefined || asset.bytes === null || asset.mime === null) return false;
  return asset.kind === 'image' || asset.state === 'ready';
}

function itemsProblem([first, ...rest]: readonly Item[]): Refusal | null {
  if (first?.role !== 'main') return 'item_order';
  if (![first, ...rest].every((item) => isPlainDoc(item.doc))) return 'rich_content';
  const last = rest.length - 1;
  const misplaced = rest.some(
    (item, index) => item.role === 'main' || (item.role === 'comment' && index !== last),
  );
  if (misplaced) return 'item_order';
  return rest.some((item) => item.media.length > 0) ? 'reply_media' : null;
}

function mediaProblem(media: readonly Media[], assets: Assets): Refusal | null {
  const ids = media.map((entry) => entry.mediaId);
  if (new Set(ids).size !== ids.length) return 'repeated_media';
  const found = ids.map((id) => assets.get(id));
  if (!found.every(isKnown)) return 'media_unavailable';
  const videos = found.filter((asset) => asset.kind === 'video').length;
  if (videos > 1) return 'many_videos';
  return videos === 1 && found.length > 1 ? 'mixed_media' : null;
}

function toImage({ mediaId, altText }: Media, asset: KnownAsset): PickedImage {
  return {
    id: mediaId,
    file: null,
    facts: { size: asset.bytes, type: asset.mime },
    thumb: asset.previewUrl,
    altText: altText ?? '',
    aiGenerated: asset.aiGenerated,
  };
}

function toContent(items: readonly Item[], assets: Assets): Content | Refusal {
  const [main] = items;
  const problem = itemsProblem(items) ?? mediaProblem(main?.media ?? [], assets);
  if (problem !== null || main === undefined) return problem ?? 'item_order';
  const known = main.media.flatMap((media) => {
    const asset = assets.get(media.mediaId);
    return isKnown(asset) ? [{ media, asset }] : [];
  });
  const video = known.find(({ asset }) => asset.kind === 'video');
  const comment = items.find((item) => item.role === 'comment');
  return {
    doc: toDoc(main.doc),
    images: video === undefined ? known.map(({ media, asset }) => toImage(media, asset)) : [],
    video:
      video === undefined ? null : { id: video.media.mediaId, altText: video.media.altText ?? '' },
    replies: items
      .filter((item) => item.role === 'thread')
      .map((item) => ({ id: crypto.randomUUID(), doc: toDoc(item.doc) })),
    comment: comment === undefined ? null : { doc: toDoc(comment.doc) },
  };
}

function toContents(post: Post, assets: Assets): Contents | Refusal {
  const base = toContent(post.items, assets);
  if (typeof base === 'string') return base;
  const customized = new Map<string, Content>();
  for (const { accountId, variant } of post.destinations) {
    if (variant === null) continue;
    const content = toContent(post.variants[variant]?.items ?? [], assets);
    if (typeof content === 'string') return content;
    customized.set(accountId, content);
  }
  return { base, customized };
}

function destinationProblem(
  post: Post,
  channels: readonly Channel[],
  contents: Contents,
): Refusal | null {
  const accounts = post.destinations.map((destination) => destination.accountId);
  if (new Set(accounts).size !== accounts.length) return 'channel_twice';
  for (const { accountId, publishType } of post.destinations) {
    const channel = channels.find((candidate) => candidate.id === accountId);
    if (channel === undefined) return 'channel_unavailable';
    const { images, video } = effective(contents, accountId);
    const media = { images: images.map((image) => image.facts), video: video !== null };
    const choice = choiceFor(channel, media);
    if (choice.kind !== 'ok') return 'channel_unavailable';
    if (choice.publishType !== publishType) return 'publish_type';
  }
  return null;
}

function toVideos(assets: Assets, contents: Contents): VideoRegistry {
  const entries = new Map<string, VideoEntry>();
  for (const { video } of [contents.base, ...contents.customized.values()]) {
    const asset = video === null ? undefined : assets.get(video.id);
    if (asset === undefined) continue;
    const { previewUrl: poster, ...facts } = asset;
    entries.set(asset.id, {
      file: null,
      url: null,
      poster,
      aiGenerated: asset.aiGenerated,
      aiFailed: false,
      phase: { kind: 'ready', asset: facts },
    });
  }
  return entries;
}

function startWhen(post: Post): WhenStart {
  const { scheduleMode, scheduleLocal, scheduleTz, destinations } = post;
  if (!destinations.some((destination) => destination.state === 'scheduled')) {
    return { mode: 'draft' };
  }
  if (scheduleMode === 'asap') return { mode: 'asap' };
  if (scheduleMode === 'local_per_destination') return { mode: 'queue' };
  if (scheduleMode !== 'instant' || scheduleLocal === null || scheduleTz === null) {
    return { mode: 'draft' };
  }
  if (upcoming(scheduleLocal, scheduleTz) === null) return { mode: 'draft' };
  return { mode: 'instant', at: scheduleLocal, tz: scheduleTz };
}

export function fromPost(post: Post, assets: Assets, channels: readonly Channel[]): FromPost {
  const contents = toContents(post, assets);
  if (typeof contents === 'string') return { ok: false, reason: contents };
  const problem = destinationProblem(post, channels, contents);
  if (problem !== null) return { ok: false, reason: problem };
  const form = {
    contents,
    selected: new Set(post.destinations.map((destination) => destination.accountId)),
    videos: toVideos(assets, contents),
    when: startWhen(post),
  };
  return { ok: true, form };
}
