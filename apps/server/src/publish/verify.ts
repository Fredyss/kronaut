import { toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { Task } from 'graphile-worker';
import { sql } from 'kysely';
import * as z from 'zod';
import { type DestinationJob, enqueueVerify } from '../jobs/jobs.ts';
import { applyPlan } from './apply.ts';
import { jsonb } from './chain.ts';
import { lockPost, SYSTEM } from './lock.ts';
import type { PublishDeps } from './task.ts';
import { attemptOutcome, settlement } from './verify-decision.ts';
import { prepareIn } from './verify-lookup.ts';
import { probe } from './verify-probe.ts';
import type { Probed, VerifyRun } from './verify-run.ts';

const PayloadSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

async function finishCheck(trx: TenantDb, run: VerifyRun, probed: Probed): Promise<boolean> {
  const found = probed.kind === 'found' ? probed : undefined;
  const failed = probed.kind === 'inconclusive' ? probed : undefined;
  const finished = await trx
    .updateTable('publish_attempts')
    .set({
      outcome: attemptOutcome(probed),
      finished_at: sql<Date>`now()`,
      error_code: failed?.errorCode ?? null,
      error_message: failed?.errorMessage ?? null,
      remote_id: found?.remoteId ?? null,
      remote_url: found?.url ?? null,
      anchor: found?.anchor === undefined ? null : jsonb(found.anchor),
    })
    .where('workspace_id', '=', run.ref.workspaceId)
    .where('id', '=', run.context.attemptId)
    .where('finished_at', 'is', null)
    .executeTakeFirst();
  return finished.numUpdatedRows === 1n;
}

async function settleIn(
  deps: PublishDeps,
  trx: TenantDb,
  run: VerifyRun,
  probed: Probed,
): Promise<void> {
  const { workspaceId, id } = run.ref;
  await lockPost(trx, workspaceId, run.ref.postId);
  const dest = await trx
    .selectFrom('post_destinations')
    .select(['state', 'version', sql<boolean>`instance_paused()`.as('paused')])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .forUpdate()
    .executeTakeFirst();
  if (!(await finishCheck(trx, run, probed))) return;
  if (
    dest === undefined ||
    dest.state !== 'verifying' ||
    dest.version !== run.ref.version ||
    dest.paused
  ) {
    return;
  }

  const settled = settlement(run, probed, deps.now(), deps.randomInt);
  if (settled.kind === 'apply') {
    await applyPlan(trx, run.context, run.ref, settled.plan);
    return;
  }
  await trx
    .updateTable('post_destinations')
    .set({ run_at: toDate(settled.next) })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .where('version', '=', run.ref.version)
    .execute();
  await enqueueVerify(trx, run.context.job, settled.next);
}

export async function runVerify(deps: PublishDeps, job: DestinationJob): Promise<void> {
  const prepared = await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    prepareIn(deps, trx, job),
  );
  if (prepared.kind !== 'run') return;
  const probed = await probe(deps, prepared.run);
  await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    settleIn(deps, trx, prepared.run, probed),
  );
}

export function verifyTask(deps: PublishDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('verify job payload is invalid');
      return;
    }
    try {
      await runVerify(deps, parsed.data);
    } catch (err) {
      deps.logger.error({ err, destinationId: parsed.data.id }, 'verify job failed');
      throw err;
    }
  };
}
