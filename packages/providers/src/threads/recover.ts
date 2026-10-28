import type { PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { idField } from '../_kit/meta-container-state.ts';
import { findRecent, type Recovered } from '../_kit/meta-recover.ts';
import { graph } from './graph.ts';
import { type Input, mediaTypeOf } from './publish-input.ts';

const POST_FIELDS = 'id,permalink,text,timestamp,media_type,children';

const post = z.looseObject({
  id: idField,
  timestamp: z.string().nullish(),
  permalink: z.string().nullish(),
  text: z.string().nullish(),
  media_type: z.string().nullish(),
  children: z.looseObject({ data: z.array(z.unknown()) }).nullish(),
});

export function recover(
  ctx: PublishContext,
  input: Input,
  sentAt: string | undefined,
): Promise<Recovered | undefined> {
  const main = input.items.find((item) => item.role === 'main');
  const text = main?.text ?? '';
  const count = main?.media.length ?? 0;
  const mediaType = mediaTypeOf(input.postType, count);
  return findRecent(ctx, graph, input, {
    path: `${input.credentials.userId}/threads`,
    fields: POST_FIELDS,
    item: post,
    matches: (candidate) =>
      candidate.media_type === mediaType &&
      (candidate.text ?? '') === text &&
      (mediaType !== 'CAROUSEL_ALBUM' || candidate.children?.data.length === count),
    sentAt,
  });
}
