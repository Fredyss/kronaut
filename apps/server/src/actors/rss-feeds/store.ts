import { encodePublicId, type Principal } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError } from '../../base/http/errors.ts';
import type { FeedRef } from './audit.ts';

export const WORKSPACE_MAX = 20;

const COLUMNS = [
  'id',
  'url',
  'name',
  'mode',
  'template',
  'state',
  'paused_reason',
  'last_checked_at',
  'last_error',
  'created_at',
  'updated_at',
] as const;

export function feedOwner(principal: Principal | null): string {
  if (principal?.kind !== 'user') {
    throw new HttpError('internal', 'No user is bound to this request.');
  }
  return principal.userId;
}

async function channelsOf(trx: TenantDb, workspaceId: string, feedIds: readonly string[]) {
  if (feedIds.length === 0) return new Map<string, string[]>();
  const rows = await trx
    .selectFrom('rss_feed_channels')
    .select(['feed_id', 'social_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where('feed_id', 'in', feedIds)
    .orderBy('social_account_id')
    .execute();
  const byFeed = new Map<string, string[]>();
  for (const row of rows) {
    byFeed.set(row.feed_id, [...(byFeed.get(row.feed_id) ?? []), row.social_account_id]);
  }
  return byFeed;
}

function feedRows(trx: TenantDb, workspaceId: string) {
  return trx.selectFrom('rss_feeds').select(COLUMNS).where('workspace_id', '=', workspaceId);
}

type FeedRow = Awaited<ReturnType<ReturnType<typeof feedRows>['executeTakeFirstOrThrow']>>;

export interface StoredFeed extends FeedRow {
  readonly channels: readonly string[];
}

export async function listFeeds(trx: TenantDb, workspaceId: string): Promise<StoredFeed[]> {
  const rows = await feedRows(trx, workspaceId).orderBy(sql`lower(name)`).orderBy('id').execute();
  const channels = await channelsOf(
    trx,
    workspaceId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({ ...row, channels: channels.get(row.id) ?? [] }));
}

export async function readFeed(trx: TenantDb, ref: FeedRef, lock = false): Promise<StoredFeed> {
  let query = feedRows(trx, ref.workspaceId).where('id', '=', ref.feedId);
  if (lock) query = query.forUpdate();
  const row = await query.executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Feed not found.');
  const channels = await channelsOf(trx, ref.workspaceId, [row.id]);
  return { ...row, channels: channels.get(row.id) ?? [] };
}

export function feedDto(feed: StoredFeed) {
  return {
    id: encodePublicId('rssFeed', feed.id),
    url: feed.url,
    name: feed.name,
    channelIds: feed.channels.map((id) => encodePublicId('socialAccount', id)),
    mode: feed.mode,
    template: feed.template,
    state: feed.state,
    pausedReason: feed.paused_reason,
    lastCheckedAt: feed.last_checked_at?.toISOString() ?? null,
    lastError: feed.last_error,
    createdAt: feed.created_at.toISOString(),
    updatedAt: feed.updated_at.toISOString(),
  };
}

export async function checkRoom(trx: TenantDb, workspaceId: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`rss_feeds:${workspaceId}`}, 0))`.execute(
    trx,
  );
  const { total } = await trx
    .selectFrom('rss_feeds')
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirstOrThrow();
  if (Number(total) >= WORKSPACE_MAX) {
    throw new HttpError('rss_feed_limit', `A workspace has at most ${WORKSPACE_MAX} feeds.`);
  }
}

export async function replaceChannels(
  trx: TenantDb,
  ref: FeedRef,
  accountIds: readonly string[],
): Promise<void> {
  await trx
    .deleteFrom('rss_feed_channels')
    .where('workspace_id', '=', ref.workspaceId)
    .where('feed_id', '=', ref.feedId)
    .execute();
  await trx
    .insertInto('rss_feed_channels')
    .values(
      accountIds.map((id) => ({
        workspace_id: ref.workspaceId,
        feed_id: ref.feedId,
        social_account_id: id,
      })),
    )
    .execute();
}

export async function deleteFeed(trx: TenantDb, ref: FeedRef): Promise<void> {
  await readFeed(trx, ref, true);
  await trx
    .deleteFrom('rss_feeds')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.feedId)
    .execute();
}
