import type { Channel } from '../api.ts';
import { type PublishChoice, providerUi } from '../providers.ts';

export type ImageFacts = Pick<File, 'size' | 'type'>;

export function choiceFor(channel: Channel, files: readonly ImageFacts[]): PublishChoice {
  if (channel.status !== 'active') return { kind: 'unsupported' };
  const ui = providerUi(channel.provider);
  const choice = ui.publishType(files.length);
  if (choice.kind !== 'ok') return choice;
  if (files.some((file) => !ui.imageTypes.includes(file.type))) {
    return { kind: 'image_type_unsupported' };
  }
  if (files.some((file) => file.size > ui.maxImageBytes)) {
    return { kind: 'image_too_large', maxBytes: ui.maxImageBytes };
  }
  return choice;
}
