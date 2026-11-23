import type {
  MediaLimits,
  MediaRef,
  PostTypeSpec,
  ProviderState,
  PublishContext,
  PublishInput,
  PublishItem,
  PublishOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, checkVideoFile, planOf } from '../_kit/meta-input.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { pinterestId } from './boards.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { type PinterestSettings, pinterestManifest } from './manifest.ts';
import { API_BASE, type PinterestCredentials } from './oauth.ts';

export type Input = PublishInput<PinterestCredentials, PinterestSettings>;

const PIN_URL = 'https://www.pinterest.com/pin/';
const DESCRIPTION_MAX = 800;
export const PIN_MAX_TOTAL_BYTES = 8_000_000;

export const mediaId = z.string().regex(/^\d+$/);
export const pinState = z.object({
  sentAt: z.iso.datetime().optional(),
  mediaId: mediaId.optional(),
  uploaded: z.boolean().optional(),
});
export type PinState = z.infer<typeof pinState>;
const created = z.looseObject({ id: pinterestId });

export interface Pin {
  readonly spec: PostTypeSpec;
  readonly item: PublishItem;
  readonly boardId: string;
}

export function pinUrl(id: string): string {
  return `${PIN_URL}${id}/`;
}

export function pinFields(settings: PinterestSettings, item: PublishItem) {
  const description = item.text.normalize('NFC');
  const altText = item.media[0]?.altText?.normalize('NFC') ?? '';
  return {
    ...(settings.title === undefined || settings.title === '' ? {} : { title: settings.title }),
    ...(description.trim() === '' ? {} : { description }),
    ...(settings.link === undefined ? {} : { link: settings.link }),
    ...(altText.trim() === '' ? {} : { alt_text: altText }),
  };
}

function checkCount(media: MediaLimits, refs: readonly MediaRef[]): void {
  if (refs.length === 0) throw permanent(media.video ? 'video_required' : 'image_required');
  if (refs.length < media.minCount) throw permanent('too_few_images');
  if (refs.length > media.maxCount)
    throw permanent(media.video ? 'too_many_media' : 'too_many_images');
}

function checkFile({ image, video }: MediaLimits, ref: MediaRef): void {
  if (video !== undefined) checkVideoFile(video, ref);
  else if (image !== undefined) checkImageFile(image, ref);
  else throw permanent('media_type_unsupported');
}

function totalBytes(refs: readonly MediaRef[]): number {
  return refs.reduce((sum, ref) => sum + ref.bytes, 0);
}

export function checkPin(input: Input): Pin {
  const { spec, item } = planOf(pinterestManifest, input);
  const { media } = spec;
  checkCount(media, item.media);
  for (const ref of item.media) checkFile(media, ref);
  if (media.video === undefined && totalBytes(item.media) > PIN_MAX_TOTAL_BYTES)
    throw permanent('images_too_large');
  if (item.media.some((ref) => (ref.altText?.length ?? 0) > media.altText.maxLength))
    throw permanent('alt_text_too_long');
  if (item.text.normalize('NFC').length > DESCRIPTION_MAX) throw permanent('text_too_long');
  const boardId = input.settings.boardId ?? '';
  if (!pinterestId.safeParse(boardId).success) throw permanent('board_missing');
  return { spec, item, boardId };
}

export interface PinCreate {
  readonly pin: Pin;
  readonly mediaSource: Readonly<Record<string, unknown>>;
  readonly state: ProviderState;
}

export async function createPin(
  ctx: PublishContext,
  input: Input,
  { pin, mediaSource, state }: PinCreate,
): Promise<PublishOutcome> {
  const body = JSON.stringify({
    board_id: pin.boardId,
    ...pinFields(input.settings, pin.item),
    media_source: mediaSource,
  });
  await beginPublicSend(ctx, 'create', state);
  const response = await send(ctx, 'public', `${API_BASE}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'public', now: ctx.now() });
  const { id } = await readJson(response, created, 'public');
  return { kind: 'published', remoteId: id, url: pinUrl(id) };
}
