import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import type { RequestContext } from '../http/types.ts';
import { dequeuePublish } from '../jobs.ts';
import { transition } from '../publish/finalize.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import { auditActor, writeDestinationAudit } from './audit.ts';
import { destinationRef, type LockedDestination, type PostRef } from './locks.ts';

export interface CancelTarget {
  readonly row: LockedDestination;
  readonly reason: 'user_canceled' | 'skipped_manual';
  readonly args?: Readonly<Record<string, unknown>>;
}

export async function cancelLocked(
  trx: TenantDb,
  ctx: RequestContext,
  post: PostRef,
  targets: readonly CancelTarget[],
): Promise<void> {
  const { workspaceId, postId } = post;
  const actor = await auditActor(trx, workspaceId, ctx.principal);
  const correlationId = randomUUID();
  for (const { row, reason, args } of targets) {
    const ref = destinationRef(workspaceId, postId, row, row.frozen_post_version);
    await transition(trx, ref, { state: 'canceled', reason });
    await dequeuePublish(trx, row.id);
    await writeDestinationAudit(trx, {
      ctx,
      actor,
      post,
      row,
      action: 'destination.canceled',
      postVersion: row.frozen_post_version,
      errorCode: reason,
      correlationId,
      ...(args === undefined ? {} : { args }),
    });
  }
  const ids = targets.map(({ row }) => row.id);
  const items = trx
    .updateTable('destination_items')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', ids);
  await items.set({ state: 'failed' }).where('state', '=', 'sending').execute();
  await items.set({ state: 'skipped' }).where('state', '=', 'pending').execute();
  await recordPostSettlement(trx, workspaceId, postId);
}
