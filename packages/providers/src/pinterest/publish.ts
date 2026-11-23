import type { PublishContext, PublishOutcome } from '@kronaut/core';
import { permanent } from '../_kit/meta-graph.ts';
import { publishCarousel } from './carousel.ts';
import { checkPin, createPin, type Input, pinState } from './pin.ts';
import { publishVideo } from './video.ts';

async function publishImage(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const pin = checkPin(input);
  const [ref] = pin.item.media;
  if (ref === undefined) throw permanent('image_required');
  const bytes = await ctx.media.read(ref.id);
  const mediaSource = {
    source_type: 'image_base64',
    content_type: ref.mime,
    data: Buffer.from(bytes).toString('base64'),
  };
  return createPin(ctx, input, { pin, mediaSource, state: {} });
}

export async function publishPin(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const parsed = pinState.safeParse(input.state);
  if (!parsed.success) throw permanent('state_invalid');
  switch (input.postType) {
    case 'pin':
      return publishImage(ctx, input);
    case 'video':
      return publishVideo(ctx, input, parsed.data);
    case 'carousel':
      return publishCarousel(ctx, input);
    default:
      throw permanent('post_type_unsupported');
  }
}
