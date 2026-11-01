import { encodePublicId } from '@kronaut/core';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { enqueueMediaImport, type MediaJob } from '../jobs.ts';
import { takeWindowQuota } from '../quota/window-quota.ts';
import { findMediaAsset, MediaAssetSchema } from './dto.ts';
import { MediaError } from './errors.ts';
import { IMPORT_ERRORS, type ImportError, refuseImport } from './import-failure.ts';

export const MEDIA_IMPORTS_PER_HOUR = 500;
export const MEDIA_IMPORTS_MAX_OPEN = 500;
const QUOTA_WINDOW_SECONDS = 60 * 60;
const OPEN_STATES = ['pending', 'fetching'];
const SYSTEM: Actor = { kind: 'system' };

export const MediaImportSchema = z.object({
  id: z.string().regex(/^mimp_[0-9a-hjkmnp-tv-z]{26}$/),
  state: z.enum(['pending', 'fetching', 'done', 'failed']),
  error: z.enum(IMPORT_ERRORS).nullable(),
  media: MediaAssetSchema.nullable(),
});

export type MediaImportDto = z.output<typeof MediaImportSchema>;

export interface NewImport {
  readonly url: string;
  readonly aiGenerated: boolean;
}

export interface ClaimedImport {
  readonly url: string;
  readonly aiGenerated: boolean;
  readonly actor: Actor;
}

export function importBucketKey(workspaceId: string): string {
  return `endpoint:media_import:${workspaceId}`;
}

function toDto(row: {
  id: string;
  state: string;
  error: string | null;
  media: unknown;
}): MediaImportDto {
  return MediaImportSchema.parse({ ...row, id: encodePublicId('mediaImport', row.id) });
}

function tooManyImports(): HttpError {
  return new HttpError('rate_limited', 'Too many imports were started recently. Try again later.');
}

async function countOpen(trx: TenantDb, workspaceId: string): Promise<number> {
  const { open } = await trx
    .selectFrom('media_imports')
    .select(sql<string>`count(*)`.as('open'))
    .where('workspace_id', '=', workspaceId)
    .where('state', 'in', OPEN_STATES)
    .executeTakeFirstOrThrow();
  return Number(open);
}

export async function createImport(
  trx: TenantDb,
  workspaceId: string,
  input: NewImport,
): Promise<MediaImportDto> {
  if ((await countOpen(trx, workspaceId)) >= MEDIA_IMPORTS_MAX_OPEN) throw tooManyImports();
  const allowed = await takeWindowQuota(trx, {
    key: importBucketKey(workspaceId),
    capacity: MEDIA_IMPORTS_PER_HOUR,
    windowSeconds: QUOTA_WINDOW_SECONDS,
  });
  if (!allowed) throw tooManyImports();
  const row = await trx
    .insertInto('media_imports')
    .values({
      workspace_id: workspaceId,
      url: input.url,
      ai_generated: input.aiGenerated,
      requested_by_user_id: sql<string | null>`app_actor_id('user')`,
      requested_by_grant_id: sql<string | null>`app_actor_id('grant')`,
    })
    .returning(['id', 'state', 'error'])
    .executeTakeFirstOrThrow();
  await enqueueMediaImport(trx, { workspaceId, id: row.id });
  return toDto({ ...row, media: null });
}

export async function findImport(
  trx: TenantDb,
  workspaceId: string,
  id: string,
): Promise<MediaImportDto> {
  const row = await trx
    .selectFrom('media_imports')
    .select(['id', 'state', 'error', 'media_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media import not found');
  const media = row.media_id === null ? null : await findMediaAsset(trx, workspaceId, row.media_id);
  return toDto({ ...row, media });
}

function requesterOf(row: {
  requested_by_user_id: string | null;
  requested_by_grant_id: string | null;
}): Actor {
  if (row.requested_by_grant_id !== null) return { kind: 'grant', id: row.requested_by_grant_id };
  if (row.requested_by_user_id !== null) return { kind: 'user', id: row.requested_by_user_id };
  return SYSTEM;
}

export async function claimImport(db: Database, job: MediaJob): Promise<ClaimedImport | null> {
  return await db.withTenant(job.workspaceId, SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('media_imports')
      .select(['state', 'url', 'ai_generated', 'requested_by_user_id', 'requested_by_grant_id'])
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .forUpdate()
      .executeTakeFirst();
    if (row === undefined || row.url === null || !OPEN_STATES.includes(row.state)) return null;
    await trx
      .updateTable('media_imports')
      .set({ state: 'fetching', updated_at: sql<Date>`now()` })
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .execute();
    return { url: row.url, aiGenerated: row.ai_generated, actor: requesterOf(row) };
  });
}

function openImport(trx: TenantDb, job: MediaJob) {
  return trx
    .updateTable('media_imports')
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .where('state', 'in', OPEN_STATES);
}

export async function markImportDone(trx: TenantDb, job: MediaJob, mediaId: string): Promise<void> {
  const { numUpdatedRows } = await openImport(trx, job)
    .set({
      state: 'done',
      url: null,
      media_id: mediaId,
      finished_at: sql<Date>`now()`,
      updated_at: sql<Date>`now()`,
    })
    .executeTakeFirst();
  if (numUpdatedRows === 0n) throw refuseImport('stalled');
}

async function markImportFailed(trx: TenantDb, job: MediaJob, kind: ImportError): Promise<void> {
  await openImport(trx, job)
    .set({
      state: 'failed',
      url: null,
      error: kind,
      finished_at: sql<Date>`now()`,
      updated_at: sql<Date>`now()`,
    })
    .execute();
}

export async function failImport(db: Database, job: MediaJob, kind: ImportError): Promise<void> {
  await db.withTenant(job.workspaceId, SYSTEM, (trx) => markImportFailed(trx, job, kind));
}

export async function settleExpiredImport(
  db: Database,
  job: MediaJob,
): Promise<'stalled' | 'deleted' | null> {
  return await db.withTenant(job.workspaceId, SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('media_imports')
      .select([
        'state',
        sql<boolean>`case state when 'pending' then created_at < now() - interval '7 days'
                                when 'fetching' then updated_at < now() - interval '24 hours'
                                else false end`.as('stale'),
        sql<boolean>`coalesce(finished_at < now() - interval '7 days', false)`.as('expired'),
      ])
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .forUpdate()
      .executeTakeFirst();
    if (row === undefined) return null;
    if (OPEN_STATES.includes(row.state)) {
      if (!row.stale) return null;
      await markImportFailed(trx, job, 'stalled');
      return 'stalled';
    }
    if (!row.expired) return null;
    await trx
      .deleteFrom('media_imports')
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .execute();
    return 'deleted';
  });
}
