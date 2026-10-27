import type { ImageLimits, MediaRef, ProviderManifest, PublishInput } from '@kronaut/core';
import type { Plan } from './meta-container-state.ts';
import { permanent } from './meta-graph.ts';

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
