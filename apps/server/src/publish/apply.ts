import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { type DestinationJob, enqueuePublish, enqueueVerify } from '../jobs.ts';
import { type CredentialFence, flagAccount, flagApp } from './incidents.ts';
import type { Plan, SideEffect } from './plan.ts';
import {
  auditTransition,
  type DestinationRef,
  type DestinationUpdate,
  transition,
} from './transition.ts';

export interface PlanContext {
  readonly job: DestinationJob;
  readonly attemptId: string;
  readonly socialAccountId: string;
  readonly providerAppId: string;
  readonly credential: CredentialFence;
}

export function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

async function applySideEffect(
  trx: TenantDb,
  context: PlanContext,
  effect: SideEffect,
): Promise<void> {
  if (effect.kind === 'account') {
    await flagAccount(trx, {
      workspaceId: context.job.workspaceId,
      socialAccountId: context.socialAccountId,
      fence: context.credential,
      incident: effect.incident,
    });
    return;
  }
  await flagApp(trx, context.job.workspaceId, context.providerAppId, effect.code);
}

function destinationSet(planned: Plan): DestinationUpdate {
  const set: DestinationUpdate = { lease_until: null };
  if (planned.state === 'published') {
    set.claimed_attempt_id = null;
    set.remote_id = planned.remoteId ?? null;
    set.remote_url = planned.remoteUrl ?? null;
    set.published_at = sql<Date>`now()`;
    set.resolution = planned.resolution ?? 'api';
    if (planned.resolution === 'verified') set.verified_at = sql<Date>`now()`;
  }
  if (planned.runAt !== undefined) set.run_at = toDate(planned.runAt);
  if (planned.lastError !== undefined) {
    set.last_error_code = planned.lastError.code;
    set.last_error_message = planned.lastError.message;
  }
  return set;
}

async function settleItems(trx: TenantDb, job: DestinationJob, planned: Plan): Promise<void> {
  const items = trx
    .updateTable('destination_items')
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id);
  if (planned.state === 'published') {
    await items
      .set({
        state: 'confirmed',
        remote_id: planned.remoteId ?? null,
        remote_url: planned.remoteUrl ?? null,
        send_started_at: sql<Date>`coalesce(send_started_at, now())`,
        confirmed_at: sql<Date>`now()`,
      })
      .where('state', 'in', ['pending', 'sending'])
      .execute();
  } else if (planned.state === 'failed' || planned.state === 'blocked') {
    await items.set({ state: 'failed' }).where('state', '=', 'sending').execute();
  } else if (planned.state === 'unconfirmed') {
    await items.set({ state: 'unconfirmed' }).where('state', '=', 'sending').execute();
  }
  if (planned.state === 'failed' || planned.state === 'canceled') {
    await items.set({ state: 'skipped' }).where('state', '=', 'pending').execute();
  }
}

async function enqueueNext(trx: TenantDb, job: DestinationJob, planned: Plan): Promise<void> {
  if (planned.state === 'retry_wait' && planned.runAt !== undefined) {
    await enqueuePublish(trx, job, planned.runAt);
  }
  if (planned.state === 'verifying' && planned.runAt !== undefined) {
    await enqueueVerify(trx, job, planned.runAt);
  }
}

export async function applyPlan(
  trx: TenantDb,
  context: PlanContext,
  ref: DestinationRef,
  planned: Plan,
): Promise<void> {
  await transition(trx, ref, {
    state: planned.state,
    reason: planned.reason,
    set: destinationSet(planned),
  });
  await settleItems(trx, context.job, planned);
  await auditTransition(trx, ref, planned, context.attemptId);
  if (planned.sideEffect !== undefined) await applySideEffect(trx, context, planned.sideEffect);
  await enqueueNext(trx, context.job, planned);
}
