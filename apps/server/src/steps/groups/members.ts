import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import { auditGroup, type GroupRef } from './audit.ts';

export interface MemberRef extends GroupRef {
  readonly accountId: string;
}

// Locking the group first makes a concurrent group delete wait for this write, or turns it into a 404 here,
// rather than a foreign-key error.
async function lockPair(trx: TenantDb, { workspaceId, groupId, accountId }: MemberRef) {
  const group = await trx
    .selectFrom('account_groups')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', groupId)
    .forKeyShare()
    .executeTakeFirst();
  if (group === undefined) throw new HttpError('not_found', 'Group not found.');
  const channel = await trx
    .selectFrom('social_accounts')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .forKeyShare()
    .executeTakeFirst();
  if (channel === undefined) throw new HttpError('not_found', 'Not found.');
}

export async function addMember(trx: TenantDb, ctx: RequestContext, ref: MemberRef) {
  await lockPair(trx, ref);
  const added = await trx
    .insertInto('account_group_members')
    .values({
      workspace_id: ref.workspaceId,
      group_id: ref.groupId,
      social_account_id: ref.accountId,
      added_by: ctx.session?.userId ?? null,
    })
    .onConflict((oc) => oc.columns(['workspace_id', 'group_id', 'social_account_id']).doNothing())
    .returning('group_id')
    .executeTakeFirst();
  if (added === undefined) return;
  const audit = { ref, action: 'account_group.channel_added', accountIds: [ref.accountId] };
  await auditGroup(trx, ctx, audit);
}

export async function removeMember(trx: TenantDb, ctx: RequestContext, ref: MemberRef) {
  await lockPair(trx, ref);
  const removed = await trx
    .deleteFrom('account_group_members')
    .where('workspace_id', '=', ref.workspaceId)
    .where('group_id', '=', ref.groupId)
    .where('social_account_id', '=', ref.accountId)
    .returning('group_id')
    .executeTakeFirst();
  if (removed === undefined) return;
  const audit = { ref, action: 'account_group.channel_removed', accountIds: [ref.accountId] };
  await auditGroup(trx, ctx, audit);
}
