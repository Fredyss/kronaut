import type { StateReason } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import type { DestinationJob } from '../jobs.ts';
import { chainBefore, currentItem, type ItemRow, jsonb, selectItems } from './chain.ts';
import type { Plan } from './plan.ts';

export interface ChainStep {
  readonly plan: Plan;
  readonly item: ItemRow | undefined;
  readonly confirm: Plan | undefined;
  readonly parentRemoteId: string | null;
  readonly providerState: unknown;
  readonly hold: boolean;
}

function selectDestination(trx: TenantDb, job: DestinationJob) {
  return trx
    .selectFrom('post_destinations')
    .select(['state', 'state_reason', 'provider_state', sql<Date>`now()`.as('now')])
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .executeTakeFirstOrThrow();
}

type DestinationRow = Awaited<ReturnType<typeof selectDestination>>;

function continued(planned: Plan, dest: DestinationRow): Plan {
  // unconfirmed -> retry_wait is not a transition; a late confirmation there leaves the chain for send again.
  if (dest.state === 'unconfirmed') {
    return {
      state: 'unconfirmed',
      reason: (dest.state_reason ?? 'ambiguous_response') as StateReason,
      outcome: planned.outcome,
    };
  }
  return {
    state: 'retry_wait',
    reason: 'chain_next',
    outcome: planned.outcome,
    runAt: Temporal.Instant.fromEpochMilliseconds(dest.now.getTime()),
  };
}

export function laterItem(item: ItemRow | undefined): ItemRow | undefined {
  return item !== undefined && item.position > 0 ? item : undefined;
}

export function failedReason(
  reason: StateReason | null,
  later: ItemRow | undefined,
): StateReason | null {
  return later === undefined ? reason : 'thread_incomplete';
}

export async function failLaterItem(
  trx: TenantDb,
  job: DestinationJob,
  later: ItemRow,
): Promise<void> {
  await trx
    .updateTable('destination_items')
    .set({ state: 'failed' })
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .where('position', '=', later.position)
    .execute();
}

export async function currentLaterItem(
  trx: TenantDb,
  job: DestinationJob,
): Promise<ItemRow | undefined> {
  return laterItem(currentItem(await selectItems(trx, job)));
}

export async function chainStep(
  trx: TenantDb,
  job: DestinationJob,
  planned: Plan,
): Promise<ChainStep> {
  const rows = await selectItems(trx, job);
  const item = currentItem(rows);
  const dest = await selectDestination(trx, job);
  const base = {
    item,
    parentRemoteId:
      item === undefined ? null : (chainBefore(rows, item.position).at(-1)?.remoteId ?? null),
    providerState: dest.provider_state,
  };
  if (planned.state === 'published') {
    const more =
      item !== undefined &&
      rows.some((row) => row.position > item.position && row.state === 'pending');
    const plan = more ? continued(planned, dest) : planned;
    return { ...base, plan, confirm: planned, hold: more && plan.state === 'unconfirmed' };
  }
  const later = laterItem(item);
  if (planned.state === 'failed' && later !== undefined) {
    return {
      ...base,
      plan: { ...planned, reason: failedReason(planned.reason, later) },
      confirm: undefined,
      hold: false,
    };
  }
  return { ...base, plan: planned, confirm: undefined, hold: false };
}

export async function settleChainItems(
  trx: TenantDb,
  job: DestinationJob,
  step: ChainStep,
): Promise<void> {
  const { plan, item, confirm } = step;
  const items = trx
    .updateTable('destination_items')
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id);
  if (confirm !== undefined) {
    if (item === undefined) return;
    await items
      .set({
        state: 'confirmed',
        remote_id: confirm.remoteId ?? null,
        remote_url: confirm.remoteUrl ?? null,
        anchor: confirm.anchor === undefined ? null : jsonb(confirm.anchor),
        reply_to_remote_id: step.parentRemoteId,
        provider_state: jsonb(step.providerState),
        send_started_at: sql<Date>`coalesce(send_started_at, now())`,
        confirmed_at: sql<Date>`now()`,
      })
      .where('position', '=', item.position)
      .execute();
    return;
  }
  const later = laterItem(item);
  if (plan.state === 'failed' && later !== undefined) {
    await failLaterItem(trx, job, later);
  } else if (plan.state === 'failed' || plan.state === 'blocked') {
    await items.set({ state: 'failed' }).where('state', '=', 'sending').execute();
  } else if (plan.state === 'unconfirmed') {
    await items.set({ state: 'unconfirmed' }).where('state', '=', 'sending').execute();
  } else if (plan.state === 'canceled') {
    await items.set({ state: 'skipped' }).where('state', '=', 'pending').execute();
  }
}
