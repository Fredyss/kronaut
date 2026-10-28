import type { DocJson } from '@kronaut/compose';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { type RawBuilder, sql } from 'kysely';
import * as z from 'zod';
import { iso, PostSummarySchema } from '../posts/dto.ts';
import { excerptOf, invalid, loadMains, zodDetails } from '../posts/list.ts';
import type { MediaSigner } from './access.ts';
import { LibraryAssetSchema, PREVIEW_COLUMNS, withPreviews } from './preview.ts';

export const LIBRARY_DEFAULT_LIMIT = 50;
export const LIBRARY_MAX_LIMIT = 100;
export const USAGE_MAX_POSTS = 50;

export const LibraryItemSchema = LibraryAssetSchema.extend({
  usageCount: z.number().int().nonnegative(),
});

export const LibraryPageSchema = z.object({
  items: z.array(LibraryItemSchema),
  nextCursor: z.string().nullable(),
});

export const UsageSchema = z.object({
  items: z.array(
    z.object({
      postId: z.string(),
      title: z.string().nullable(),
      excerpt: z.string(),
      publishSummary: PostSummarySchema.shape.publishSummary,
      scheduledAt: z.iso.datetime().nullable(),
    }),
  ),
});

type LibraryPage = z.output<typeof LibraryPageSchema>;
type Usage = z.output<typeof UsageSchema>;

const LibraryQuery = z.strictObject({
  kind: z.enum(['image', 'video']).optional(),
  cursor: z.string().max(64).optional(),
  limit: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(LIBRARY_MAX_LIMIT))
    .optional(),
});

export interface LibraryFilter {
  readonly kind: 'image' | 'video' | null;
  readonly after: string | null;
  readonly limit: number;
}

export function libraryFilter(query: Readonly<Record<string, string | undefined>>): LibraryFilter {
  const present = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined));
  const parsed = LibraryQuery.safeParse(present);
  if (!parsed.success) throw invalid(zodDetails(parsed.error));
  const { kind, cursor, limit } = parsed.data;
  const after = cursor === undefined ? null : decodePublicId('media', cursor);
  if (after === null && cursor !== undefined) {
    throw invalid([{ path: 'query.cursor', code: 'invalid_cursor' }]);
  }
  return { kind: kind ?? null, after, limit: limit ?? LIBRARY_DEFAULT_LIMIT };
}

export function postsUsing(workspaceId: RawBuilder<unknown>, mediaId: RawBuilder<unknown>) {
  return sql<{ post_id: string }>`
    SELECT i.post_id FROM item_media im
      JOIN variant_items i ON i.workspace_id = im.workspace_id AND i.id = im.item_id
     WHERE im.workspace_id = ${workspaceId} AND im.media_asset_id = ${mediaId}
    UNION
    SELECT d.post_id FROM destination_media dm
      JOIN post_destinations d ON d.workspace_id = dm.workspace_id AND d.id = dm.destination_id
     WHERE dm.workspace_id = ${workspaceId} AND dm.media_asset_id = ${mediaId}`;
}

export function referenced(workspaceId: RawBuilder<unknown>, mediaId: RawBuilder<unknown>) {
  return sql<boolean>`(
    EXISTS (SELECT 1 FROM item_media WHERE workspace_id = ${workspaceId} AND media_asset_id = ${mediaId})
    OR EXISTS (SELECT 1 FROM destination_media WHERE workspace_id = ${workspaceId} AND media_asset_id = ${mediaId}))`;
}

export interface LibraryScope {
  readonly signer: MediaSigner;
  readonly workspaceId: string;
}

export async function listLibrary(
  trx: TenantDb,
  { signer, workspaceId }: LibraryScope,
  filter: LibraryFilter,
): Promise<LibraryPage> {
  let query = trx
    .selectFrom('media_assets as m')
    .select(PREVIEW_COLUMNS.map((column) => `m.${column}` as const))
    .select(
      sql<string>`(SELECT count(*) FROM (${postsUsing(sql.ref('m.workspace_id'), sql.ref('m.id'))}) u)`.as(
        'usage_count',
      ),
    )
    .where('m.workspace_id', '=', workspaceId)
    .where('m.in_library', '=', true)
    .where('m.deleted_at', 'is', null)
    .where('m.state', 'in', ['ready', 'processing'])
    .where('m.duplicate_of_id', 'is', null);
  if (filter.kind !== null) query = query.where('m.kind', '=', filter.kind);
  if (filter.after !== null) query = query.where('m.id', '<', filter.after);
  const rows = await query
    .orderBy('m.id', 'desc')
    .limit(filter.limit + 1)
    .execute();
  const page = rows.slice(0, filter.limit);
  const last = page.at(-1);
  const assets = await withPreviews(trx, signer, workspaceId, page);
  return {
    items: assets.map((asset, index) => ({
      ...asset,
      usageCount: Number(page[index]?.usage_count ?? 0),
    })),
    nextCursor:
      rows.length > filter.limit && last !== undefined ? encodePublicId('media', last.id) : null,
  };
}

export async function usageOf(trx: TenantDb, workspaceId: string, mediaId: string): Promise<Usage> {
  const posts = await trx
    .selectFrom('posts as p')
    .select(['p.id', 'p.title', 'p.publish_summary'])
    .select((eb) =>
      eb
        .selectFrom('post_destinations as d')
        .select((inner) => inner.fn.min('d.scheduled_at').as('first_at'))
        .whereRef('d.workspace_id', '=', 'p.workspace_id')
        .whereRef('d.post_id', '=', 'p.id')
        .as('scheduled_at'),
    )
    .where('p.workspace_id', '=', workspaceId)
    .where(sql<boolean>`p.id IN (${postsUsing(sql.val(workspaceId), sql.val(mediaId))})`)
    .orderBy('p.created_at', 'desc')
    .orderBy('p.id', 'desc')
    .limit(USAGE_MAX_POSTS)
    .execute();
  if (posts.length === 0) return { items: [] };
  const mains = await loadMains(
    trx,
    workspaceId,
    posts.map((post) => post.id),
  );
  const mainOf = new Map(mains.map((main) => [main.post_id, main]));
  return UsageSchema.parse({
    items: posts.map((post) => {
      const main = mainOf.get(post.id);
      return {
        postId: encodePublicId('post', post.id),
        title: post.title,
        excerpt: main === undefined ? '' : excerptOf(main.doc as unknown as DocJson),
        publishSummary: post.publish_summary,
        scheduledAt: iso(post.scheduled_at),
      };
    }),
  });
}
