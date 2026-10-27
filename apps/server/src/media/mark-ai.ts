import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { MEDIA_ASSET_COLUMNS, type MediaAssetDto, toMediaAssetDto } from './dto.ts';
import { MediaError } from './errors.ts';

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
    .select(MEDIA_ASSET_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .where('deleted_at', 'is', null)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media asset not found');
  if (row.state === 'rejected') {
    throw new MediaError('conflict', 'a rejected media asset cannot be marked');
  }
  if (row.ai_generated) return toMediaAssetDto(row);
  const actor = await auditActor(trx, workspaceId, ctx.principal);
  const marked = await trx
    .updateTable('media_assets')
    .set({ ai_generated: true, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .returning(MEDIA_ASSET_COLUMNS)
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      ...actor,
      action: 'media.ai_marked',
      resource_kind: 'media_asset',
      resource_id: mediaId,
      outcome: 'ok',
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
  return toMediaAssetDto(marked);
}
