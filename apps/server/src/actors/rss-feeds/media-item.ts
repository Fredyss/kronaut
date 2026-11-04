import type { DraftMedia } from '@kronaut/compose';
import { toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../base/http/errors.ts';
import { actAs, OwnerLost, ownerActing } from '../../flow/posts/owner/owner.ts';
import type { OwnerEnv } from '../../flow/posts/owner/owner-schedule.ts';
import { checkImportUrl, insertImport } from '../../records/media-imports/imports.ts';
import type { FeedRef } from './audit.ts';
import type { FeedImage } from './image.ts';
import type { ItemMedia, PostingFeed } from './item.ts';
import type { Fetching } from './seen.ts';

const IMPORT_HOURS = 1;
const TEXT_MAX_BYTES = 65536;
const OPEN: ReadonlySet<string> = new Set(['pending', 'fetching']);

// A refused import only costs the image: the item still goes out as text.
export async function startImport(
  trx: TenantDb,
  env: OwnerEnv,
  feed: PostingFeed,
  { image, text }: { readonly image: FeedImage; readonly text: string },
): Promise<Fetching | null> {
  if (Buffer.byteLength(text) > TEXT_MAX_BYTES) return null;
  const { workspaceId } = env;
  const acting = await ownerActing(trx, workspaceId, { ...feed, owner_grant_id: null }, env.now);
  await sql`savepoint rss_import`.execute(trx);
  try {
    acting.authorize('media:write', { workspaceId });
    await actAs(trx, acting.actor);
    const url = checkImportUrl(image.url);
    const created = await insertImport(trx, workspaceId, { url, aiGenerated: false });
    await sql`release savepoint rss_import`.execute(trx);
    return { importId: created.id, text, altText: image.alt };
  } catch (err) {
    await sql`rollback to savepoint rss_import`.execute(trx);
    if (err instanceof HttpError || err instanceof OwnerLost) return null;
    throw err;
  }
}

export async function hasPending(trx: TenantDb, ref: FeedRef): Promise<boolean> {
  const row = await trx
    .selectFrom('rss_items')
    .select('key')
    .where('workspace_id', '=', ref.workspaceId)
    .where('feed_id', '=', ref.feedId)
    .where('outcome', '=', 'fetching_media')
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}

export function pendingItems(trx: TenantDb, ref: FeedRef, limit: number) {
  return trx
    .selectFrom('rss_items as i')
    .leftJoin('media_imports as m', (join) =>
      join.onRef('m.workspace_id', '=', 'i.workspace_id').onRef('m.id', '=', 'i.media_import_id'),
    )
    .leftJoin('media_assets as a', (join) =>
      join.onRef('a.workspace_id', '=', 'm.workspace_id').onRef('a.id', '=', 'm.media_id'),
    )
    .select(['i.key', 'i.text', 'i.alt_text', 'i.attempts'])
    .select(['m.state as import_state', 'm.created_at as import_at'])
    .select(['a.id as asset_id', 'a.kind', 'a.state as asset_state'])
    .select(['a.mime', 'a.bytes', 'a.width', 'a.height'])
    .where('i.workspace_id', '=', ref.workspaceId)
    .where('i.feed_id', '=', ref.feedId)
    .where('i.outcome', '=', 'fetching_media')
    .orderBy('i.created_at')
    .orderBy('i.key')
    .limit(limit)
    .execute();
}

export type PendingItem = Awaited<ReturnType<typeof pendingItems>>[number];

function factsOf(row: PendingItem, mime: string): DraftMedia {
  return {
    kind: 'image',
    mime,
    bytes: Number(row.bytes),
    ...(row.width === null ? {} : { width: row.width }),
    ...(row.height === null ? {} : { height: row.height }),
    ...(row.alt_text === null ? {} : { altText: row.alt_text }),
  };
}

export function pendingMedia(row: PendingItem, now: Temporal.Instant): ItemMedia | null | 'wait' {
  const started = row.import_at;
  const open = started !== null && started > toDate(now.subtract({ hours: IMPORT_HOURS }));
  if (row.import_state !== null && OPEN.has(row.import_state)) return open ? 'wait' : null;
  if (row.import_state !== 'done' || row.kind !== 'image' || row.asset_id === null) return null;
  if (row.asset_state !== 'ready') return row.asset_state !== 'rejected' && open ? 'wait' : null;
  if (row.mime === null || row.bytes === null) return null;
  return { assetId: row.asset_id, altText: row.alt_text, facts: factsOf(row, row.mime) };
}
