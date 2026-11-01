import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { auditActor } from '../audit/write.ts';
import type { ChannelRef } from '../channels/channel-ref.ts';
import type { RequestContext } from '../http/types.ts';
import type { QueueSlot } from './slots.ts';

export interface QueueChange {
  readonly timezone: string | null;
  readonly slots: readonly QueueSlot[];
}

export async function replaceSlots(
  trx: TenantDb,
  ref: ChannelRef,
  { timezone, slots }: QueueChange,
): Promise<void> {
  await trx
    .deleteFrom('queue_slots')
    .where('workspace_id', '=', ref.workspaceId)
    .where('social_account_id', '=', ref.accountId)
    .execute();
  if (timezone !== null) {
    await trx
      .insertInto('queue_slots')
      .values(
        slots.map((slot) => ({
          workspace_id: ref.workspaceId,
          social_account_id: ref.accountId,
          weekday: slot.weekday,
          local_time: slot.time.toString({ smallestUnit: 'minute' }),
          timezone,
        })),
      )
      .execute();
  }
}

export async function auditQueueUpdate(
  trx: TenantDb,
  ctx: RequestContext,
  ref: ChannelRef,
  { timezone, slots }: QueueChange,
): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action: 'channel.queue_updated',
      resource_kind: 'social_account',
      resource_id: ref.accountId,
      social_account_ids: [ref.accountId],
      outcome: 'ok',
      args_summary: JSON.stringify({ timezone, slots: slots.length }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}
