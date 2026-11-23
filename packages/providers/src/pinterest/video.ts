import { ProviderFailure, type PublishContext, type PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { videoPolling } from './manifest.ts';
import { uploadVideo } from './media-upload.ts';
import { API_BASE } from './oauth.ts';
import { checkPin, createPin, type Input, type PinState } from './pin.ts';

const mediaStatus = z.looseObject({ status: z.string().nullish() });

async function readStatus(ctx: PublishContext, input: Input, id: string) {
  const response = await send(ctx, 'private', `${API_BASE}/media/${id}`, {
    headers: { Authorization: `Bearer ${input.credentials.accessToken}` },
  });
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'private', now: ctx.now() });
  return (await readJson(response, mediaStatus, 'private')).status;
}

export async function publishVideo(
  ctx: PublishContext,
  input: Input,
  initial: PinState,
): Promise<PublishOutcome> {
  const pin = checkPin(input);
  const [ref] = pin.item.media;
  if (ref === undefined) throw permanent('video_required');
  const id =
    initial.mediaId !== undefined && initial.uploaded === true
      ? initial.mediaId
      : await uploadVideo(ctx, input, ref);
  switch (await readStatus(ctx, input, id)) {
    case 'registered':
    case 'processing':
      return { kind: 'pending', pollAfterMs: videoPolling.pollIntervalMs };
    case 'succeeded': {
      const mediaSource = { source_type: 'video_id', media_id: id, cover_image_key_frame_time: 0 };
      return createPin(ctx, input, { pin, mediaSource, state: { mediaId: id, uploaded: true } });
    }
    case 'failed':
      throw permanent('video_processing_failed');
    default:
      throw new ProviderFailure({ kind: 'transient', detail: 'media_status_unknown' });
  }
}
