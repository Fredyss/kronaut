import type { DB, TenantDb } from '@kronaut/db';
import { sql, type UpdateObject } from 'kysely';
import { HttpError } from '../http/errors.ts';
import type { DestinationRef } from '../publish/finalize.ts';
import { type LockedPost, lockPost } from '../publish/lock.ts';

export interface PostRef {
  readonly workspaceId: string;
  readonly postId: string;
}

export interface CurrentPost extends LockedPost {
  readonly version: number;
}

export async function lockCurrent(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<CurrentPost> {
  const locked = await lockPost(trx, workspaceId, postId);
  const current =
    locked === undefined
      ? undefined
      : await trx
          .selectFrom('posts')
          .select('version')
          .where('workspace_id', '=', workspaceId)
          .where('id', '=', postId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
  if (locked === undefined || current === undefined) {
    throw new HttpError('not_found', 'Post not found.');
  }
  return { ...locked, version: current.version };
}

export function checkVersion(post: CurrentPost, expectedVersion: number): void {
  if (post.version !== expectedVersion) {
    throw new HttpError('version_conflict', 'The post was changed by someone else.');
  }
}

export async function bumpPost(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
  set: UpdateObject<DB, 'posts'> = {},
): Promise<number> {
  const { version } = await trx
    .updateTable('posts')
    .set({ ...set, version: sql<number>`version + 1`, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .returning('version')
    .executeTakeFirstOrThrow();
  return version;
}

export function destinationRows(trx: TenantDb, workspaceId: string, postId: string) {
  return trx
    .selectFrom('post_destinations')
    .select([
      'id',
      'state',
      'state_reason',
      'version',
      'social_account_id',
      'provider',
      'publish_type',
      'delivery_mode',
      'settings',
      'variant_id',
      'skip_signature',
      'frozen_post_version',
      'approval_request_id',
      'cancel_requested_at',
    ])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at')
    .orderBy('id');
}

export async function lockDestinations(trx: TenantDb, workspaceId: string, postId: string) {
  return await destinationRows(trx, workspaceId, postId).forUpdate().execute();
}

export type LockedDestination = Awaited<ReturnType<typeof lockDestinations>>[number];

export function destinationRef(
  workspaceId: string,
  postId: string,
  row: LockedDestination,
  postVersion: number | null,
): DestinationRef {
  return {
    workspaceId,
    id: row.id,
    postId,
    postVersion,
    socialAccountId: row.social_account_id,
    version: row.version,
  };
}
