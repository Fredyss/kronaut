import type { Channel } from '../api.ts';
import { type PublishChoice, providerUi } from '../providers.ts';

export type ImageFacts = Pick<File, 'size' | 'type'>;

export interface MediaFacts {
  readonly images: readonly ImageFacts[];
  readonly video: boolean;
}

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
