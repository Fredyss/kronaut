import { type PublishChoice, providerUi } from '../../../base/providers/ui.ts';
import type { Channel } from '../../../records/channels/queries.ts';

export type ImageFacts = Pick<File, 'size' | 'type'>;

export interface MediaFacts {
  readonly images: readonly ImageFacts[];
  readonly video: boolean;
}

export const NO_MEDIA: MediaFacts = { images: [], video: false };

export function choiceFor(channel: Channel, { images, video }: MediaFacts): PublishChoice {
  if (channel.status !== 'active') return { kind: 'unsupported' };
  const ui = providerUi(channel.provider);
  const choice = ui.publishType({ images: images.length, video });
  if (choice.kind !== 'ok') return choice;
  if (images.some((file) => !ui.imageTypes.includes(file.type))) {
    return { kind: 'image_type_unsupported' };
  }
  if (images.some((file) => file.size > ui.maxImageBytes)) {
    return { kind: 'image_too_large', maxBytes: ui.maxImageBytes };
  }
  return choice;
}
