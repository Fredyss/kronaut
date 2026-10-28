import { randomInt } from 'node:crypto';
import type { PublishOutcome } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { Database } from '@kronaut/db';
import { toProviderFailure } from '@kronaut/providers/failure';
import type { Task } from 'graphile-worker';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import type { DestinationJob } from '../jobs.ts';
import type { MediaAccess } from '../media-access.ts';
import type { ProviderRegistry } from '../providers.ts';
import type { RandomInt } from './backoff.ts';
import { claim } from './claim.ts';
import { createRunContext, LEASE_HEARTBEAT_MS } from './context.ts';
import { closeAttempt, finalize } from './finalize.ts';
import type { RunResult } from './plan.ts';
import { refreshCredential } from './refresh.ts';
import { canRefresh } from './refresh-lease.ts';

export interface PublishDeps {
  readonly db: Database;
  readonly providers: ProviderRegistry;
  readonly keyring: Keyring;
  readonly media: MediaAccess;
  readonly logger: Logger;
  readonly workerId: string;
  readonly publicBaseUrl: string;
  readonly now: () => Temporal.Instant;
  readonly randomInt: RandomInt;
  readonly heartbeatMs: number;
}

export type PublishDepsInput = Omit<PublishDeps, 'now' | 'randomInt' | 'heartbeatMs'> &
  Partial<Pick<PublishDeps, 'now' | 'randomInt' | 'heartbeatMs'>>;

const PayloadSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

export function publishDeps(input: PublishDepsInput): PublishDeps {
  return {
    now: () => Temporal.Now.instant(),
    randomInt,
    heartbeatMs: LEASE_HEARTBEAT_MS,
    ...input,
  };
}

function fromOutcome(outcome: PublishOutcome): RunResult {
  if (outcome.kind === 'pending') return { kind: 'pending', pollAfterMs: outcome.pollAfterMs };
  return {
    kind: 'published',
    remoteId: outcome.remoteId,
    ...(outcome.url === undefined ? {} : { url: outcome.url }),
    ...(outcome.anchor === undefined ? {} : { anchor: outcome.anchor }),
  };
}

export async function runPublish(deps: PublishDeps, job: DestinationJob): Promise<void> {
  const claimed = await claim(deps, job);
  if (claimed.kind !== 'claimed') return;
  const { entry, credential, afterRefresh } = claimed.claimed;
  const controller = new AbortController();
  const run = createRunContext(deps, claimed.claimed, controller);
  let result: RunResult;
  try {
    result = fromOutcome(await entry.runtime.publish(run.ctx, claimed.claimed.input));
  } catch (err) {
    const error = toProviderFailure(err, run.effect()).error;
    result = { kind: 'failure', error };
    if (
      error.kind === 'auth_expired' &&
      run.effect() !== 'public' &&
      !afterRefresh &&
      canRefresh(entry)
    ) {
      const refresh = await refreshCredential(
        deps,
        {
          workspaceId: job.workspaceId,
          credentialId: credential.id,
          expectedVersion: credential.version,
        },
        'wait',
      );
      result = { kind: 'failure', error, refresh };
    }
  } finally {
    await run.stop();
  }
  const refusal = run.refusal();
  if (refusal === null || refusal === 'canceled') {
    await finalize(deps, claimed.claimed, refusal === null ? result : { kind: 'canceled' });
  } else {
    await closeAttempt(deps, claimed.claimed);
  }
}

export function publishTask(deps: PublishDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('publish job payload is invalid');
      return;
    }
    try {
      await runPublish(deps, parsed.data);
    } catch (err) {
      deps.logger.error({ err, destinationId: parsed.data.id }, 'publish job failed');
      throw err;
    }
  };
}
