import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { auditActor } from '../../access/audit/write.ts';
import type { RequestContext } from '../../base/http/request.ts';

export interface GroupRef {
  readonly workspaceId: string;
  readonly groupId: string;
}

export interface GroupAudit {
  readonly ref: GroupRef;
  readonly action: string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly accountIds?: readonly string[];
}

export async function auditGroup(
  trx: TenantDb,
  ctx: RequestContext,
  { ref, action, args, accountIds }: GroupAudit,
): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action,
      resource_kind: 'account_group',
      resource_id: ref.groupId,
      account_group_id: ref.groupId,
      ...(accountIds === undefined ? {} : { social_account_ids: [...accountIds] }),
      outcome: 'ok',
      ...(args === undefined ? {} : { args_summary: JSON.stringify(args) }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}
