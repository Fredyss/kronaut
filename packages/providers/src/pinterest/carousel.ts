import type { PublishContext, PublishOutcome } from '@kronaut/core';
import { checkPin, createPin, type Input } from './pin.ts';

export async function publishCarousel(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const pin = checkPin(input);
  const items = [];
  for (const ref of pin.item.media) {
    const bytes = await ctx.media.read(ref.id);
    items.push({ content_type: ref.mime, data: Buffer.from(bytes).toString('base64') });
  }
  const mediaSource = { source_type: 'multiple_image_base64', items };
  return createPin(ctx, input, { pin, mediaSource, state: {} });
}
