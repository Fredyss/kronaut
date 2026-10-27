import type { Actor, TenantDb } from '@kronaut/db';

export const SYSTEM: Actor = { kind: 'system' };

export interface LockedPost {
  readonly id: string;
  readonly brand_id: string | null;
  readonly location_id: string | null;
}

export async function lockPost(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<LockedPost | undefined> {
  return await trx
    .selectFrom('posts')
    .select(['id', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .forNoKeyUpdate()
    .executeTakeFirst();
}
