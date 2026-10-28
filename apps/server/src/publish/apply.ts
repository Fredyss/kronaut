import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { type DestinationJob, enqueuePublish, enqueueVerify } from '../jobs.ts';
import { type ChainStep, chainStep, settleChainItems } from './chain-step.ts';
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

function destinationSet(step: ChainStep): DestinationUpdate {
  const { plan: planned, confirm } = step;
  const set: DestinationUpdate = { lease_until: null };
  if (confirm !== undefined) {
    set.provider_state = sql`'{}'::jsonb`;
    if (step.item === undefined || step.item.position === 0) {
      set.remote_id = confirm.remoteId ?? null;
      set.remote_url = confirm.remoteUrl ?? null;
      set.published_at = sql<Date>`now()`;
    }
  }
  if (planned.state === 'published') {
    set.claimed_attempt_id = null;
    set.resolution = planned.resolution ?? 'api';
    if (planned.resolution === 'verified') set.verified_at = sql<Date>`now()`;
  }
  if (planned.reason === 'chain_next') set.attempt_count = 0;
  if (planned.runAt !== undefined) set.run_at = toDate(planned.runAt);
  if (planned.lastError !== undefined) {
    set.last_error_code = planned.lastError.code;
    set.last_error_message = planned.lastError.message;
  }
  return set;
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
  const step = await chainStep(trx, context.job, planned);
  const next = step.plan;
  await transition(trx, ref, { state: next.state, reason: next.reason, set: destinationSet(step) });
  await settleChainItems(trx, context.job, step);
  if (step.hold) return;
  await auditTransition(trx, ref, next, context.attemptId);
  if (next.sideEffect !== undefined) await applySideEffect(trx, context, next.sideEffect);
  await enqueueNext(trx, context.job, next);
}
