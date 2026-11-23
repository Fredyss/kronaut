import { isProviderFailure, type PublishContext, type VerifyOutcome } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { pinterestId } from './boards.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { API_BASE } from './oauth.ts';
import { type Input, pinFields, pinState, pinUrl } from './pin.ts';

const PAGE_SIZE = '100';

const boardPins = z.looseObject({
  items: z.array(
    z.looseObject({
      id: pinterestId,
      created_at: z.string().nullish(),
      title: z.string().nullish(),
      description: z.string().nullish(),
      link: z.string().nullish(),
      alt_text: z.string().nullish(),
    }),
  ),
});
type BoardPin = z.infer<typeof boardPins>['items'][number];

interface Expected {
  readonly title: string;
  readonly description: string;
  readonly link: string;
  readonly altText: string;
}

function comparable(text: string | null | undefined): string {
  return (text ?? '').normalize('NFC').trim();
}

// The docs don't say whether created_at carries an offset; a bare time is read as UTC.
function createdAt(value: string | null | undefined): Temporal.Instant | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return Temporal.Instant.from(value);
    return Temporal.PlainDateTime.from(value).toZonedDateTime('UTC').toInstant();
  } catch {
    return undefined;
  }
}

function matches(pin: BoardPin, expected: Expected, since: Temporal.Instant): boolean {
  const at = createdAt(pin.created_at);
  return (
    at !== undefined &&
    Temporal.Instant.compare(at, since) >= 0 &&
    comparable(pin.title) === expected.title &&
    comparable(pin.description) === expected.description &&
    comparable(pin.link) === expected.link &&
    (expected.altText === '' || comparable(pin.alt_text) === expected.altText)
  );
}

async function readBoardPins(ctx: PublishContext, token: string, boardId: string) {
  const url = new URL(`${API_BASE}/boards/${boardId}/pins`);
  url.searchParams.set('page_size', PAGE_SIZE);
  const response = await send(ctx, 'none', url, { headers: { Authorization: `Bearer ${token}` } });
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'none', now: ctx.now() });
  return (await readJson(response, boardPins, 'none')).items;
}

export async function verifyPin(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const sentAt = pinState.safeParse(input.state).data?.sentAt;
  const item = input.items[0];
  const boardId = pinterestId.safeParse(input.settings.boardId).data;
  if (sentAt === undefined || item === undefined || boardId === undefined)
    return { kind: 'inconclusive' };
  const fields = pinFields(input.settings, item);
  const expected = {
    title: comparable(fields.title),
    description: comparable(fields.description),
    link: comparable(fields.link),
    altText: comparable(fields.alt_text),
  };
  if (expected.title === '' && expected.description === '' && expected.link === '')
    return { kind: 'inconclusive' };
  try {
    const pins = await readBoardPins(ctx, input.credentials.accessToken, boardId);
    const since = Temporal.Instant.from(sentAt).round({
      smallestUnit: 'second',
      roundingMode: 'floor',
    });
    const [match, ...others] = pins.filter((pin) => matches(pin, expected, since));
    if (match === undefined || others.length > 0) return { kind: 'inconclusive' };
    return { kind: 'found', remoteId: match.id, url: pinUrl(match.id) };
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
