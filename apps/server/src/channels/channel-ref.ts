import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../http/errors.ts';

export interface ChannelRef {
  readonly workspaceId: string;
  readonly accountId: string;
}

export async function requireChannel(trx: TenantDb, { workspaceId, accountId }: ChannelRef) {
  const account = await trx
    .selectFrom('social_accounts')
    .select(['id', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .executeTakeFirst();
  if (account === undefined) throw new HttpError('not_found', 'Not found.');
  return account;
}
