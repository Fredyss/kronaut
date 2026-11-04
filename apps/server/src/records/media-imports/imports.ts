import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError } from '../../base/http/errors.ts';
import { enqueueMediaImport } from '../../infrastructure/jobs/jobs.ts';
import { takeWindowQuota } from '../../infrastructure/quota/window-quota.ts';

export const MEDIA_IMPORTS_PER_HOUR = 500;
export const MEDIA_IMPORTS_MAX_OPEN = 500;
const QUOTA_WINDOW_SECONDS = 60 * 60;
const OPEN_STATES = ['pending', 'fetching'];

export interface NewImport {
  readonly url: string;
  readonly aiGenerated: boolean;
}

export function importBucketKey(workspaceId: string): string {
  return `endpoint:media_import:${workspaceId}`;
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

export async function insertImport(trx: TenantDb, workspaceId: string, input: NewImport) {
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
  return row;
}

const URL_MAX_LENGTH = 2048;

export function checkImportUrl(value: string): string {
  const parsed = value.length > URL_MAX_LENGTH ? null : URL.parse(value);
  if (
    parsed === null ||
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.href.length > URL_MAX_LENGTH
  ) {
    throw new HttpError('invalid_request', 'url must be an https link without credentials', {
      details: [{ path: 'body.url', code: 'url_invalid' }],
    });
  }
  return parsed.href;
}
