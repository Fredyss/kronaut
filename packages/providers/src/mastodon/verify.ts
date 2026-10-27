import {
  isProviderFailure,
  ProviderFailure,
  type PublishContext,
  type PublishItem,
  type VerifyOutcome,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { httpsUrl } from './connect.ts';
import { mastodonManifest } from './manifest.ts';
import { authorized, endpoint, type Input, publishState, remoteId } from './publish-state.ts';

const PAGE = 40;
const CLOCK_SKEW = Temporal.Duration.from({ minutes: 2 });
const WINDOW = Temporal.Duration.from({ milliseconds: mastodonManifest.verify.windowMs });
const REMOTE_MENTION =
  /(?<![\p{L}\p{N}_/=@])(@[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?)@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const statuses = z.array(
  z.looseObject({
    id: remoteId,
    created_at: z.string(),
    url: z.string().nullish(),
    content: z.string().nullish(),
    media_attachments: z.array(z.looseObject({ id: z.string() })).nullish(),
  }),
);
type Status = z.infer<typeof statuses>[number];

function decodeEntity(entity: string, name: string): string {
  const code = name.startsWith('#x')
    ? Number.parseInt(name.slice(2), 16)
    : name.startsWith('#')
      ? Number.parseInt(name.slice(1), 10)
      : undefined;
  if (code === undefined) return ENTITIES[name] ?? entity;
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : entity;
}

export function plainContent(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,6});/gi, decodeEntity);
}

export function comparable(text: string): string {
  return text.normalize('NFC').replace(REMOTE_MENTION, '$1').replace(/\s+/gu, ' ').trim();
}

function instantOf(value: string): Temporal.Instant | undefined {
  try {
    return Temporal.Instant.from(value);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  return left.size === a.length && a.length === b.length && b.every((id) => left.has(id));
}

function matcher(item: PublishItem, input: Input): (status: Status) => boolean {
  const state = publishState.safeParse(input.state).data;
  if (item.media.length > 0) {
    const expected = item.media.map((ref) => state?.media?.[ref.id]?.id ?? '');
    return (status) =>
      sameSet(
        expected,
        (status.media_attachments ?? []).map((media) => media.id),
      );
  }
  const text = comparable(item.text);
  return (status) => comparable(plainContent(status.content ?? '')) === text;
}

async function recent(ctx: PublishContext, input: Input): Promise<Status[] | undefined> {
  const accountId = input.account.providerAccountId.split('@')[0] ?? '';
  if (!remoteId.safeParse(accountId).success) return undefined;
  const url = endpoint(input, `/api/v1/accounts/${accountId}/statuses`);
  url.searchParams.set('limit', String(PAGE));
  url.searchParams.set('exclude_reblogs', 'true');
  const response = await send(ctx, 'none', url, { headers: authorized(input) });
  if (response.status === 401) throw new ProviderFailure({ kind: 'auth_revoked' });
  if (response.status !== 200) return undefined;
  return readJson(response, statuses, 'none');
}

function decide(
  list: readonly Status[],
  since: Temporal.Instant,
  matches: (status: Status) => boolean,
): VerifyOutcome {
  let reachedSince = list.length < PAGE;
  for (const status of list) {
    const at = instantOf(status.created_at);
    if (at === undefined) continue;
    if (Temporal.Instant.compare(at, since) < 0) {
      reachedSince = true;
      continue;
    }
    if (matches(status)) {
      const url = httpsUrl(status.url);
      return { kind: 'found', remoteId: status.id, ...(url === undefined ? {} : { url }) };
    }
  }
  return reachedSince ? { kind: 'absent' } : { kind: 'inconclusive' };
}

export async function verifyStatus(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const state = publishState.safeParse(input.state).data;
  if (state?.status !== undefined) {
    const { id, url } = state.status;
    return { kind: 'found', remoteId: id, ...(url === undefined ? {} : { url }) };
  }
  const item = input.items.find((candidate) => candidate.role === 'main');
  const sentAt = state?.sentAt === undefined ? undefined : instantOf(state.sentAt);
  if (item === undefined || sentAt === undefined) return { kind: 'inconclusive' };
  if (Temporal.Instant.compare(ctx.now(), sentAt.add(WINDOW)) > 0) return { kind: 'inconclusive' };
  try {
    const list = await recent(ctx, input);
    if (list === undefined) return { kind: 'inconclusive' };
    return decide(list, sentAt.subtract(CLOCK_SKEW), matcher(item, input));
  } catch (error) {
    if (isProviderFailure(error) && error.error.kind !== 'auth_revoked')
      return { kind: 'inconclusive' };
    throw error;
  }
}
