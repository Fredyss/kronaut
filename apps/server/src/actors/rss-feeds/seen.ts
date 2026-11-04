import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { FeedRef } from './audit.ts';
import type { FeedItem } from './parse.ts';

const BATCH = 500;
const KEEP_DAYS = 30;

export type ItemOutcome =
  | 'fetching_media'
  | 'scheduled'
  | 'requested'
  | 'drafted'
  | 'skipped'
  | 'retrying'
  | 'failed';

export interface SeenAt extends FeedRef {
  readonly at: Date;
}

export interface ItemRecord {
  readonly key: Buffer;
  readonly outcome: ItemOutcome;
  readonly errorCode: string | null;
  readonly postId: string | null;
  readonly attempts?: number;
  readonly fetching?: Fetching;
}

export interface Fetching {
  readonly importId: string;
  readonly text: string;
  readonly altText: string | null;
}

export interface Known {
  readonly settled: ReadonlySet<string>;
  readonly attempts: ReadonlyMap<string, number>;
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
): Promise<Known> {
  const settled = new Set<string>();
  const attempts = new Map<string, number>();
  for (let start = 0; start < found.length; start += BATCH) {
    const keys = found.slice(start, start + BATCH).map((item) => item.key);
    const rows = await items(trx, ref)
      .where('key', 'in', keys)
      .returning(['key', 'outcome', 'attempts'])
      .execute();
    for (const row of rows) {
      const key = row.key.toString('hex');
      if (row.outcome === 'retrying') attempts.set(key, row.attempts);
      else settled.add(key);
    }
  }
  return { settled, attempts };
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
      attempts: record.attempts ?? 0,
      media_import_id: record.fetching?.importId ?? null,
      text: record.fetching?.text ?? null,
      alt_text: record.fetching?.altText ?? null,
      last_seen_at: ref.at,
    })
    .onConflict((oc) =>
      oc.columns(['workspace_id', 'feed_id', 'key']).doUpdateSet((eb) => ({
        outcome: eb.ref('excluded.outcome'),
        error_code: eb.ref('excluded.error_code'),
        post_id: eb.ref('excluded.post_id'),
        attempts: eb.ref('excluded.attempts'),
        media_import_id: sql<
          string | null
        >`coalesce(excluded.media_import_id, rss_items.media_import_id)`,
        text: eb.ref('excluded.text'),
        alt_text: eb.ref('excluded.alt_text'),
        last_seen_at: eb.ref('excluded.last_seen_at'),
      })),
    )
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
