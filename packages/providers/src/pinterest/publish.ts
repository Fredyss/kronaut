import type {
  MediaRef,
  PublishContext,
  PublishInput,
  PublishItem,
  PublishOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { checkImageFile, planOf } from '../_kit/meta-input.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { pinterestId } from './boards.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { type PinterestSettings, pinterestManifest } from './manifest.ts';
import { API_BASE, type PinterestCredentials } from './oauth.ts';

export type Input = PublishInput<PinterestCredentials, PinterestSettings>;

const PIN_URL = 'https://www.pinterest.com/pin/';
const DESCRIPTION_MAX = 800;

export const pinState = z.object({ sentAt: z.iso.datetime().optional() });
const created = z.looseObject({ id: pinterestId });

interface Pin {
  readonly item: PublishItem;
  readonly ref: MediaRef;
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

function checkPin(input: Input): Pin {
  const { spec, item } = planOf(pinterestManifest, input);
  const [ref, ...rest] = item.media;
  if (ref === undefined) throw permanent('image_required');
  if (rest.length > 0) throw permanent('too_many_images');
  const { image, altText } = spec.media;
  if (image === undefined) throw permanent('media_type_unsupported');
  checkImageFile(image, ref);
  if ((ref.altText?.length ?? 0) > altText.maxLength) throw permanent('alt_text_too_long');
  if (item.text.normalize('NFC').length > DESCRIPTION_MAX) throw permanent('text_too_long');
  const boardId = input.settings.boardId ?? '';
  if (!pinterestId.safeParse(boardId).success) throw permanent('board_missing');
  return { item, ref, boardId };
}

export async function publishPin(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  if (!pinState.safeParse(input.state).success) throw permanent('state_invalid');
  const { item, ref, boardId } = checkPin(input);
  const bytes = await ctx.media.read(ref.id);
  const body = JSON.stringify({
    board_id: boardId,
    ...pinFields(input.settings, item),
    media_source: {
      source_type: 'image_base64',
      content_type: ref.mime,
      data: Buffer.from(bytes).toString('base64'),
    },
  });
  await beginPublicSend(ctx, 'create', {});
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
