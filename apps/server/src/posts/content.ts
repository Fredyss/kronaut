import type { TenantDb } from '@kronaut/db';
import type { PostRef } from './locks.ts';

export async function loadContent(trx: TenantDb, input: PostRef) {
  const { workspaceId, postId } = input;
  const variants = await trx
    .selectFrom('post_variants')
    .select(['id', 'is_default', 'content_language'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .execute();
  const items = await trx
    .selectFrom('variant_items')
    .select(['id', 'variant_id', 'position', 'role', 'doc', 'doc_schema_v'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('position')
    .execute();
  const media =
    items.length === 0
      ? []
      : await trx
          .selectFrom('item_media as m')
          .innerJoin('media_assets as a', (join) =>
            join
              .onRef('a.workspace_id', '=', 'm.workspace_id')
              .onRef('a.id', '=', 'm.media_asset_id'),
          )
          .select([
            'm.item_id',
            'm.alt_text',
            'm.transform',
            'a.id',
            'a.kind',
            'a.sha256',
            'a.mime',
            'a.bytes',
            'a.width',
            'a.height',
            'a.duration_ms',
            'a.ai_generated',
          ])
          .where('m.workspace_id', '=', workspaceId)
          .where(
            'm.item_id',
            'in',
            items.map((item) => item.id),
          )
          .orderBy('m.position')
          .execute();
  return { variants, items, media };
}

type MediaRow = Awaited<ReturnType<typeof loadContent>>['media'][number];

export function mediaSnapshot(row: MediaRow) {
  if (row.sha256 === null || row.mime === null || row.bytes === null) {
    throw new Error(`media asset ${row.id} is attached but not ready`);
  }
  return {
    assetId: row.id,
    sha256: row.sha256.toString('hex'),
    kind: row.kind,
    mime: row.mime,
    bytes: Number(row.bytes),
    ...(row.width === null ? {} : { width: row.width }),
    ...(row.height === null ? {} : { height: row.height }),
    ...(row.duration_ms === null ? {} : { durationMs: row.duration_ms }),
    altText: row.alt_text,
    aiGenerated: row.ai_generated,
    transform: row.transform,
  };
}
