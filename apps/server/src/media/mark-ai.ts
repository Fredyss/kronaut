import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { RequestContext } from '../http/types.ts';
import { MEDIA_ASSET_COLUMNS, type MediaAssetDto, toMediaAssetDto } from './dto.ts';
import { MediaError } from './errors.ts';
import { auditMedia } from './library-edit.ts';

export interface MarkTarget {
  readonly workspaceId: string;
  readonly mediaId: string;
}

export async function markAiGenerated(
  trx: TenantDb,
  ctx: RequestContext,
  { workspaceId, mediaId }: MarkTarget,
): Promise<MediaAssetDto> {
  const row = await trx
    .selectFrom('media_assets')
    .select([...MEDIA_ASSET_COLUMNS, 'ai_locked'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .where('deleted_at', 'is', null)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media asset not found');
  if (row.state === 'rejected') {
    throw new MediaError('conflict', 'a rejected media asset cannot be marked');
  }
  const byGrant = ctx.principal?.kind === 'grant';
  if (row.ai_generated && (row.ai_locked || !byGrant)) return toMediaAssetDto(row);
  const marked = await trx
    .updateTable('media_assets')
    .set({ ai_generated: true, ai_locked: row.ai_locked || byGrant, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .returning(MEDIA_ASSET_COLUMNS)
    .executeTakeFirstOrThrow();
  await auditMedia(trx, ctx, { workspaceId, mediaId }, 'media.ai_marked');
  return toMediaAssetDto(marked);
}
