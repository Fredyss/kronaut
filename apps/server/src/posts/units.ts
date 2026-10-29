import type { Resource, ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../http/errors.ts';
import type { LockedPost } from '../publish/lock.ts';

export function scopeUnit(
  socialAccountId: string | null,
  brandId: string | null,
  locationId: string | null,
): ScopeUnit {
  return {
    ...(socialAccountId === null ? {} : { socialAccountId }),
    ...(brandId === null ? {} : { brandId }),
    ...(locationId === null ? {} : { locationId }),
  };
}

export async function postUnits(
  trx: TenantDb,
  workspaceId: string,
  post: LockedPost,
): Promise<ScopeUnit[]> {
  const accounts = await trx
    .selectFrom('post_destinations as d')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .select(['a.id', 'a.brand_id', 'a.location_id'])
    .where('d.workspace_id', '=', workspaceId)
    .where('d.post_id', '=', post.id)
    .execute();
  const units = accounts.map((a) => scopeUnit(a.id, a.brand_id, a.location_id));
  if (post.brand_id !== null) units.push(scopeUnit(null, post.brand_id, post.location_id));
  return units;
}

export async function postResource(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<Resource> {
  const post = await trx
    .selectFrom('posts')
    .select(['id', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (post === undefined) throw new HttpError('not_found', 'Post not found.');
  return { workspaceId, postId, units: await postUnits(trx, workspaceId, post) };
}
