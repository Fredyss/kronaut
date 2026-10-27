import type { Database } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import type { TenantTarget } from './bind.ts';
import { type Execution, execute, type Outcome } from './execute.ts';
import {
  completeIdempotency,
  IDEMPOTENCY_HEADER,
  type IdempotencySlot,
  idempotencyKey,
  requestHash,
  reserveIdempotency,
} from './idempotency.ts';

export interface IdempotentRun {
  readonly db: Database;
  readonly request: Request;
  readonly url: URL;
  readonly raw: Uint8Array;
  readonly target: TenantTarget | null;
  readonly now: Temporal.Instant;
  readonly execution: Execution;
}

export type Settled =
  | { readonly replayed: true; readonly status: number; readonly body: unknown }
  | ({ readonly replayed: false } & Outcome);

export async function executeIdempotent(run: IdempotentRun): Promise<Settled> {
  const { request, url, target, now, execution } = run;
  const bound = execution.bound.route;
  const key = idempotencyKey(request.headers.get(IDEMPOTENCY_HEADER));
  if (target === null) {
    throw new Error(`route ${bound.id} reached idempotency without a workspace`);
  }
  const slot: IdempotencySlot = {
    workspaceId: target.workspaceId,
    actorKey: `${target.actor.kind}:${target.actor.id}`,
    key,
  };
  const hash = requestHash(bound.id, url.pathname, url.search.slice(1), run.raw);
  // One transaction: a failed write rolls the reservation back, and a concurrent retry of
  // the same key waits on the key's row instead of seeing a half-finished request.
  return await run.db.withTenant(
    target.workspaceId,
    target.actor,
    async (trx): Promise<Settled> => {
      const reservation = await reserveIdempotency(trx, slot, hash, now);
      if (reservation.kind === 'replay') {
        const body = reservation.body === null ? undefined : reservation.body;
        return { replayed: true, status: reservation.status, body };
      }
      execution.state.shared = trx;
      try {
        const done = await execute(execution);
        await completeIdempotency(trx, slot, done.status, done.body);
        return { replayed: false, ...done };
      } finally {
        execution.state.shared = null;
      }
    },
  );
}
