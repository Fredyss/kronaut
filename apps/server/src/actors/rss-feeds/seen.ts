import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { FeedRef } from './audit.ts';
import type { FeedItem } from './parse.ts';

const BATCH = 500;
const KEEP_DAYS = 30;

export type ItemOutcome = 'scheduled' | 'requested' | 'drafted' | 'failed';

export interface SeenAt extends FeedRef {
  readonly at: Date;
}

export interface ItemRecord {
  readonly key: Buffer;
  readonly outcome: ItemOutcome;
  readonly errorCode: string | null;
  readonly postId: string | null;
}

function items(trx: TenantDb, ref: SeenAt) {
  return trx
    .updateTable('rss_items')
    .set({ last_seen_at: ref.at })
    .where('workspace_id', '=', ref.workspaceId)
    .where('feed_id', '=', ref.feedId);
}

export async function markSeen(trx: TenantDb, ref: SeenAt, found: readonly FeedItem[]) {
  for (let start = 0; start < found.length; start += BATCH) {
    const rows = found.slice(start, start + BATCH).map((item) => ({
      workspace_id: ref.workspaceId,
      feed_id: ref.feedId,
      key: item.key,
      outcome: 'seen',
      last_seen_at: ref.at,
    }));
    await trx
      .insertInto('rss_items')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['workspace_id', 'feed_id', 'key']).doUpdateSet({ last_seen_at: ref.at }),
      )
      .execute();
  }
}

export async function touchKnown(
  trx: TenantDb,
  ref: SeenAt,
  found: readonly FeedItem[],
): Promise<ReadonlySet<string>> {
  const known = new Set<string>();
  for (let start = 0; start < found.length; start += BATCH) {
    const keys = found.slice(start, start + BATCH).map((item) => item.key);
    const rows = await items(trx, ref).where('key', 'in', keys).returning('key').execute();
    for (const row of rows) known.add(row.key.toString('hex'));
  }
  return known;
}

export async function touchAll(trx: TenantDb, ref: SeenAt): Promise<void> {
  await items(trx, ref).execute();
}

export async function recordItem(trx: TenantDb, ref: SeenAt, record: ItemRecord) {
  await trx
    .insertInto('rss_items')
    .values({
      workspace_id: ref.workspaceId,
      feed_id: ref.feedId,
      key: record.key,
      outcome: record.outcome,
      error_code: record.errorCode,
      post_id: record.postId,
      last_seen_at: ref.at,
    })
    .execute();
}

// Measured from the feed's own last check, so a paused feed keeps the items it would see again.
export async function collectItems(trx: TenantDb, workspaceId: string) {
  const result = await trx
    .deleteFrom('rss_items')
    .where('workspace_id', '=', workspaceId)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('rss_feeds as f')
          .select('f.id')
          .whereRef('f.workspace_id', '=', 'rss_items.workspace_id')
          .whereRef('f.id', '=', 'rss_items.feed_id')
          .where(
            sql<boolean>`f.last_checked_at > rss_items.last_seen_at + ${`${KEEP_DAYS} days`}::interval`,
          ),
      ),
    )
    .executeTakeFirst();
  return Number(result.numDeletedRows);
}
