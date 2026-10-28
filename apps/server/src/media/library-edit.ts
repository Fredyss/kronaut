import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { ALT_TEXT_MAX } from './dto.ts';
import { MediaError } from './errors.ts';
import { referenced } from './library.ts';

export interface AssetTarget {
  readonly workspaceId: string;
  readonly mediaId: string;
}

export async function lockAsset(trx: TenantDb, { workspaceId, mediaId }: AssetTarget) {
  const row = await trx
    .selectFrom('media_assets')
    .select(['ai_generated', 'ai_locked'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .where('deleted_at', 'is', null)
    .where('in_library', '=', true)
    .where('state', 'in', ['ready', 'processing'])
    .where('duplicate_of_id', 'is', null)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media asset not found');
  return row;
}

export async function auditMedia(
  trx: TenantDb,
  ctx: RequestContext,
  { workspaceId, mediaId }: AssetTarget,
  action: string,
): Promise<void> {
  const actor = await auditActor(trx, workspaceId, ctx.principal);
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      ...actor,
      action,
      resource_kind: 'media_asset',
      resource_id: mediaId,
      outcome: 'ok',
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

export function normalizeAltText(value: string | null): string | null {
  const text = value?.normalize('NFC').trim() ?? '';
  if (text === '') return null;
  if ([...text].length > ALT_TEXT_MAX) {
    throw new HttpError('unprocessable', 'The alt text is too long.', {
      details: [{ path: 'body.altText', code: 'too_long' }],
    });
  }
  return text;
}

function setColumns(trx: TenantDb, target: AssetTarget) {
  return trx
    .updateTable('media_assets')
    .where('workspace_id', '=', target.workspaceId)
    .where('id', '=', target.mediaId);
}

export async function updateAltText(
  trx: TenantDb,
  ctx: RequestContext,
  target: AssetTarget,
  altText: string | null | undefined,
): Promise<void> {
  await lockAsset(trx, target);
  if (altText === undefined) return;
  await setColumns(trx, target).set({ alt_text: altText, updated_at: sql<Date>`now()` }).execute();
  await auditMedia(trx, ctx, target, 'media.updated');
}

function clearRefusal(row: { ai_generated: boolean; ai_locked: boolean }) {
  if (!row.ai_generated) return 'the media asset is not marked as AI-generated';
  if (row.ai_locked) return 'an API key or agent uploaded or marked this media asset';
  return null;
}

export async function clearAiGenerated(
  trx: TenantDb,
  ctx: RequestContext,
  target: AssetTarget,
): Promise<void> {
  const refusal = clearRefusal(await lockAsset(trx, target));
  if (refusal !== null) throw new MediaError('conflict', refusal);
  await setColumns(trx, target)
    .set({ ai_generated: false, updated_at: sql<Date>`now()` })
    .execute();
  await auditMedia(trx, ctx, target, 'media.ai_cleared');
}

export async function softDelete(
  trx: TenantDb,
  ctx: RequestContext,
  target: AssetTarget,
): Promise<void> {
  await lockAsset(trx, target);
  const { used } = await trx
    .selectNoFrom(referenced(sql.val(target.workspaceId), sql.val(target.mediaId)).as('used'))
    .executeTakeFirstOrThrow();
  if (used) throw new MediaError('media_in_use', 'posts still use this media asset');
  await setColumns(trx, target)
    .set({ deleted_at: sql<Date>`now()`, updated_at: sql<Date>`now()` })
    .execute();
  await auditMedia(trx, ctx, target, 'media.deleted');
}
