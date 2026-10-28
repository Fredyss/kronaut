import type {
  ImageLimits,
  MediaRef,
  ProviderManifest,
  PublishInput,
  VideoLimits,
} from '@kronaut/core';
import type { Plan } from './meta-container-state.ts';
import { permanent } from './meta-graph.ts';

type AspectBounds = Pick<ImageLimits, 'minAspect' | 'maxAspect'>;

export function planOf<S>(manifest: ProviderManifest<S>, input: PublishInput<unknown, S>): Plan {
  const spec = manifest.postTypes.find((type) => type.id === input.postType);
  if (spec === undefined) throw permanent('post_type_unsupported');
  if (input.items.some((item) => item.role !== 'main')) throw permanent('thread_unsupported');
  const [item, ...rest] = input.items;
  if (item === undefined) throw permanent('main_item_missing');
  if (rest.length > 0) throw permanent('main_item_multiple');
  return { spec, item };
}

export function checkImageFile(image: ImageLimits, ref: MediaRef): void {
  if (ref.mime.startsWith('video/') || ref.durationMs !== undefined)
    throw permanent('video_unsupported');
  if (!image.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
  if (ref.bytes > image.maxBytes) throw permanent('image_too_large');
}

export function checkAspect({ minAspect: min, maxAspect: max }: AspectBounds, ref: MediaRef): void {
  const { width, height } = ref;
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    if (min !== undefined && width * min.height < height * min.width)
      throw permanent('aspect_ratio_unsupported');
    if (max !== undefined && width * max.height > height * max.width)
      throw permanent('aspect_ratio_unsupported');
  }
}

export function checkVideoFile(video: VideoLimits, ref: MediaRef): void {
  const { durationMs } = ref;
  if (!video.mimes.includes(ref.mime) || durationMs === undefined)
    throw permanent('video_required');
  if (ref.bytes > video.maxBytes) throw permanent('video_too_large');
  if (durationMs < video.minDurationMs) throw permanent('video_too_short');
  if (durationMs > video.maxDurationMs) throw permanent('video_too_long');
  checkAspect(video, ref);
}
