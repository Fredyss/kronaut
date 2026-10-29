import type { PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { idField } from '../_kit/meta-container-state.ts';
import { findRecent, type Recovered } from '../_kit/meta-recover.ts';
import { sentAltText } from './create-containers.ts';
import { graph } from './graph-call.ts';
import type { Input } from './publish-input.ts';

const MEDIA_FIELDS = 'id,timestamp,media_type,permalink,alt_text';

const MEDIA_TYPES: Readonly<Record<string, string>> = {
  image: 'IMAGE',
  carousel: 'CAROUSEL_ALBUM',
  reel: 'VIDEO',
};

const media = z.looseObject({
  id: idField,
  timestamp: z.string().nullish(),
  media_type: z.string().nullish(),
  permalink: z.string().nullish(),
  alt_text: z.string().nullish(),
});

export function recover(
  ctx: PublishContext,
  input: Input,
  sentAt: string | undefined,
): Promise<Recovered | undefined> {
  const mediaType = MEDIA_TYPES[input.postType];
  const main = input.items.find((item) => item.role === 'main');
  const altText = input.postType === 'image' ? sentAltText(main?.media[0]) : undefined;
  return findRecent(ctx, graph, input, {
    path: `${input.credentials.userId}/media`,
    fields: MEDIA_FIELDS,
    item: media,
    matches: (candidate) => {
      if (mediaType === undefined || candidate.media_type !== mediaType) return false;
      return !(mediaType === 'IMAGE' && altText !== undefined && candidate.alt_text !== altText);
    },
    sentAt,
  });
}
