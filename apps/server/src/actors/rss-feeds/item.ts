import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { lockCurrent } from '../../access/post-access/locks.ts';
import { postUnits } from '../../access/post-access/units.ts';
import { HttpError } from '../../base/http/errors.ts';
import { unprocessable } from '../../base/http/issues.ts';
import { authorOf, insertDraft } from '../../flow/posts/draft/create.ts';
import { actAs, type OwnerActing, ownerActing } from '../../flow/posts/owner/owner.ts';
import {
  needsRequest,
  type OwnerEnv,
  type OwnerTurn,
  QUEUE,
  requestAsOwner,
  scheduleOrRequest,
} from '../../flow/posts/owner/owner-schedule.ts';
import { textOnlyType } from './input.ts';
import type { FeedItem } from './parse.ts';
import type { ItemOutcome } from './seen.ts';
import { renderDoc } from './template.ts';

export const CONTENT_ERRORS: ReadonlySet<string> = new Set([
  'invalid_request',
  'unprocessable',
  'preflight_failed',
]);

const QUEUE_CODES: ReadonlySet<string> = new Set(['queue_empty', 'queue_full']);

export interface FeedChannel {
  readonly id: string;
  readonly provider: string;
  readonly capabilities: unknown;
}

export interface PostingFeed {
  readonly owner_user_id: string;
  readonly mode: string;
  readonly template: string;
  readonly channels: readonly FeedChannel[];
}

export interface ItemPost {
  readonly outcome: ItemOutcome;
  readonly errorCode: string | null;
  readonly postId: string;
}

function destinations(env: OwnerEnv, channels: readonly FeedChannel[]) {
  return channels.map((channel) => {
    const publishType = textOnlyType(env.providers, channel);
    if (publishType === null) {
      throw unprocessable([{ path: 'channels', code: 'text_unsupported' }]);
    }
    return { accountId: encodePublicId('socialAccount', channel.id), publishType };
  });
}

async function draftOf(trx: TenantDb, env: OwnerEnv, feed: PostingFeed, item: FeedItem) {
  const { workspaceId } = env;
  const acting = await ownerActing(trx, workspaceId, { ...feed, owner_grant_id: null }, env.now);
  await actAs(trx, acting.actor);
  const postId = await insertDraft(trx, env.providers, {
    workspaceId,
    body: {
      items: [{ doc: renderDoc(feed.template, item) }],
      destinations: destinations(env, feed.channels),
    },
    columns: { schedule_mode: 'unscheduled', ...authorOf(acting.principal), origin: 'rss' },
    authorize: (units) => acting.authorize('posts:draft', { workspaceId, units }),
  });
  return { acting, postId };
}

async function queue(trx: TenantDb, env: OwnerEnv, acting: OwnerActing, postId: string) {
  const locked = await lockCurrent(trx, env.workspaceId, postId);
  const units = await postUnits(trx, env.workspaceId, locked);
  const turn: OwnerTurn = { env, acting, locked, units };
  return (await needsRequest(trx, turn, false))
    ? await requestAsOwner(trx, turn, QUEUE)
    : await scheduleOrRequest(trx, turn, QUEUE);
}

function queueFull(err: HttpError): boolean {
  return err.details?.some((detail) => QUEUE_CODES.has(detail.code)) ?? false;
}

// A slot or content problem must keep the draft, so only the scheduling rolls back.
export async function scheduleOrKeep(
  trx: TenantDb,
  postId: string,
  schedule: () => Promise<'scheduled' | 'requested'>,
): Promise<ItemPost> {
  await sql`savepoint rss_schedule`.execute(trx);
  try {
    const outcome = await schedule();
    await sql`release savepoint rss_schedule`.execute(trx);
    return { outcome, errorCode: null, postId };
  } catch (err) {
    if (!(err instanceof HttpError) || !CONTENT_ERRORS.has(err.code)) throw err;
    await sql`rollback to savepoint rss_schedule`.execute(trx);
    if (queueFull(err)) return { outcome: 'drafted', errorCode: null, postId };
    return { outcome: 'failed', errorCode: err.code, postId };
  }
}

export async function postItem(
  trx: TenantDb,
  env: OwnerEnv,
  feed: PostingFeed,
  item: FeedItem,
): Promise<ItemPost> {
  const { acting, postId } = await draftOf(trx, env, feed, item);
  if (feed.mode !== 'queue') return { outcome: 'drafted', errorCode: null, postId };
  return await scheduleOrKeep(trx, postId, () => queue(trx, env, acting, postId));
}
