import type { ProviderState, PublishContext } from '@kronaut/core';
import { toProviderFailure } from '@kronaut/providers/failure';
import { sql } from 'kysely';
import { createBaseContext, PROVIDER_EGRESS } from '../providers.ts';
import { StepRefused } from './context.ts';
import { SYSTEM } from './lock.ts';
import { errorFields } from './plan.ts';
import type { PublishDeps } from './task.ts';
import { type Call, inconclusive, type Probed, type VerifyRun } from './verify-run.ts';

function verifyContext(deps: PublishDeps, run: VerifyRun, call: Call): PublishContext {
  const { workspaceId, id } = run.ref;
  const logger = deps.logger.child({
    destinationId: id,
    attemptId: run.context.attemptId,
    provider: call.entry.manifest.id,
  });
  return {
    ...createBaseContext(
      call.entry,
      logger,
      AbortSignal.timeout(PROVIDER_EGRESS.timeoutMs),
      deps.now,
    ),
    media: {
      signedUrl: () => Promise.reject(new Error('a verifier cannot sign media URLs')),
      read: (mediaId) => deps.media.read(workspaceId, mediaId),
    },
    async step(stepId) {
      const effect = call.steps.get(stepId);
      if (effect === undefined) throw new Error(`unknown step ${stepId}`);
      if (effect === 'public') throw new StepRefused('fenced');
    },
    async checkpoint(state: ProviderState) {
      await deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
        trx
          .updateTable('post_destinations')
          .set({ provider_state: sql`${JSON.stringify(state)}::jsonb` })
          .where('workspace_id', '=', workspaceId)
          .where('id', '=', id)
          .where('claimed_attempt_id', '=', run.claimedAttemptId)
          .execute(),
      );
    },
  };
}

export async function probe(deps: PublishDeps, run: VerifyRun): Promise<Probed> {
  if (run.target.kind === 'skip') return run.target.probed;
  const { call } = run.target;
  const ctx = verifyContext(deps, run, call);
  const { runtime } = call.entry;
  try {
    if (run.poll && runtime.poll !== undefined) {
      const outcome = await runtime.poll(ctx, call.input);
      return outcome.kind === 'published'
        ? {
            kind: 'found',
            remoteId: outcome.remoteId,
            ...(outcome.url === undefined ? {} : { url: outcome.url }),
          }
        : { kind: 'pending', pollAfterMs: outcome.pollAfterMs };
    }
    if (runtime.verify === undefined) return inconclusive('verify_unsupported');
    const outcome = await runtime.verify(ctx, call.input);
    if (outcome.kind !== 'found') return { kind: outcome.kind };
    return {
      kind: 'found',
      remoteId: outcome.remoteId,
      ...(outcome.url === undefined ? {} : { url: outcome.url }),
    };
  } catch (err) {
    const fields = errorFields(toProviderFailure(err, 'none').error);
    return inconclusive(fields.errorCode, fields.errorMessage);
  }
}
