import type { ProviderState, PublishContext, StepEffect } from '@kronaut/core';
import { sql } from 'kysely';
import { createBaseContext } from '../providers.ts';
import { stepsFor } from './chain.ts';
import type { Claimed } from './claim.ts';
import { lockPost, SYSTEM } from './lock.ts';
import type { PublishDeps } from './task.ts';

export const LEASE_HEARTBEAT_MS = 30_000;
const IMAGE_URL_TTL_SECONDS = 3600;
const VIDEO_URL_TTL_SECONDS = 21_600;

export type Refusal = 'canceled' | 'lease_lost' | 'fenced';

export class StepRefused extends Error {
  readonly refusal: Refusal;

  constructor(refusal: Refusal) {
    super(`public step refused: ${refusal}`);
    this.name = 'StepRefused';
    this.refusal = refusal;
  }
}

export interface RunContext {
  readonly ctx: PublishContext;
  effect(): StepEffect;
  refusal(): Refusal | null;
  stop(): Promise<void>;
}

async function writeAhead(deps: PublishDeps, claimed: Claimed): Promise<Refusal | null> {
  const { workspaceId, id } = claimed.job;
  return await deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    await lockPost(trx, workspaceId, claimed.postId);
    const fenced = await trx
      .selectFrom('post_destinations')
      .select('id')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .where('state', '=', 'publishing')
      .where('claimed_attempt_id', '=', claimed.attemptId)
      .where('lease_until', '>', sql<Date>`now()`)
      .where('cancel_requested_at', 'is', null)
      .forUpdate()
      .executeTakeFirst();
    if (fenced !== undefined) {
      await trx
        .updateTable('publish_attempts')
        .set({ public_send_at: sql<Date>`coalesce(public_send_at, now())` })
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', claimed.attemptId)
        .where('finished_at', 'is', null)
        .execute();
      await trx
        .updateTable('destination_items')
        .set({ state: 'sending', send_started_at: sql<Date>`now()` })
        .where('workspace_id', '=', workspaceId)
        .where('destination_id', '=', id)
        .where('position', '=', claimed.position)
        .where('state', 'in', ['pending', 'sending'])
        .execute();
      return null;
    }
    const row = await trx
      .selectFrom('post_destinations')
      .select(['state', 'claimed_attempt_id', 'cancel_requested_at'])
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (row?.state !== 'publishing' || row.claimed_attempt_id !== claimed.attemptId) {
      return 'fenced';
    }
    return row.cancel_requested_at === null ? 'lease_lost' : 'canceled';
  });
}

async function renewLease(deps: PublishDeps, claimed: Claimed): Promise<boolean> {
  const { workspaceId, id } = claimed.job;
  const result = await deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx
      .updateTable('post_destinations')
      .set({ lease_until: sql<Date>`now() + interval '120 seconds'` })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .where('state', '=', 'publishing')
      .where('claimed_attempt_id', '=', claimed.attemptId)
      .executeTakeFirst(),
  );
  return result.numUpdatedRows === 1n;
}

function mediaTtlSeconds(claimed: Claimed, mediaId: string): number {
  const media = claimed.items.flatMap((item) => item.media).find((m) => m.id === mediaId);
  if (media === undefined) throw new Error('media is not part of this destination');
  return media.mime.startsWith('video/') ? VIDEO_URL_TTL_SECONDS : IMAGE_URL_TTL_SECONDS;
}

export function createRunContext(
  deps: PublishDeps,
  claimed: Claimed,
  controller: AbortController,
): RunContext {
  const { workspaceId, id } = claimed.job;
  const logger = deps.logger.child({
    destinationId: id,
    attemptId: claimed.attemptId,
    provider: claimed.entry.manifest.id,
  });
  let effect: StepEffect = 'none';
  let refusal: Refusal | null = null;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let beating: Promise<void> | null = null;

  const beat = async (): Promise<void> => {
    try {
      if (!(await renewLease(deps, claimed))) controller.abort(new Error('lease lost'));
    } catch (err) {
      logger.warn({ err }, 'lease renewal failed');
    }
  };
  const schedule = (): void => {
    if (stopped || controller.signal.aborted) return;
    timer = setTimeout(() => {
      beating = beat().finally(() => {
        beating = null;
        schedule();
      });
    }, deps.heartbeatMs);
    timer.unref();
  };
  schedule();

  const ctx: PublishContext = {
    ...createBaseContext(claimed.entry, logger, controller.signal, deps.now),
    media: {
      signedUrl: (mediaId) =>
        deps.media.signedUrl(workspaceId, mediaId, mediaTtlSeconds(claimed, mediaId)),
      read: (mediaId) => deps.media.read(workspaceId, mediaId),
    },
    async step(stepId) {
      const spec = stepsFor(claimed.postType, claimed.role).find((step) => step.id === stepId);
      if (spec === undefined) throw new Error(`unknown step ${stepId}`);
      if (effect !== 'public') effect = spec.effect;
      if (spec.effect !== 'public') return;
      const refused = await writeAhead(deps, claimed);
      if (refused === null) return;
      refusal = refused;
      const error = new StepRefused(refused);
      controller.abort(error);
      throw error;
    },
    async checkpoint(state: ProviderState) {
      await deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
        trx
          .updateTable('post_destinations')
          .set({ provider_state: sql`${JSON.stringify(state)}::jsonb` })
          .where('workspace_id', '=', workspaceId)
          .where('id', '=', id)
          .where('claimed_attempt_id', '=', claimed.attemptId)
          .execute(),
      );
    },
  };

  return {
    ctx,
    effect: () => effect,
    refusal: () => refusal,
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await beating;
    },
  };
}
