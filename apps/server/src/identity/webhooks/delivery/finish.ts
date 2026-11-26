import { randomUUID } from 'node:crypto';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import type { Claimed } from './claim.ts';
import type { SendOutcome } from './egress.ts';
import { DISABLE_AFTER_DAYS, retryDelaySeconds } from './schedule.ts';

const SYSTEM: Actor = { kind: 'system' };

export type Finished = 'delivered' | 'retry' | 'dead' | 'stale';

function deliveryUpdate(claimed: Claimed, outcome: SendOutcome) {
  if (outcome.ok) {
    return {
      state: 'delivered',
      delivered_at: sql<Date>`now()`,
      last_http_status: outcome.status,
      last_error: null,
    };
  }
  const delay = retryDelaySeconds(claimed.attempt);
  return {
    state: delay === null ? 'dead' : 'retry_wait',
    ...(delay === null
      ? {}
      : { next_attempt_at: sql<Date>`now() + make_interval(secs => ${delay})` }),
    last_http_status: outcome.status,
    last_error: outcome.error,
  };
}

async function recordSuccess(trx: TenantDb, claimed: Claimed): Promise<void> {
  await trx
    .updateTable('webhook_endpoints')
    .set({ consecutive_failures: 0, failing_since: null })
    .where('workspace_id', '=', claimed.workspaceId)
    .where('id', '=', claimed.endpointId)
    .where((eb) => eb.or([eb('consecutive_failures', '>', 0), eb('failing_since', 'is not', null)]))
    .execute();
}

async function auditDisabled(trx: TenantDb, claimed: Claimed): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: claimed.workspaceId,
      actor_kind: 'system',
      surface: 'worker',
      action: 'webhook_endpoint.auto_disabled',
      resource_kind: 'webhook_endpoint',
      resource_id: claimed.endpointId,
      outcome: 'ok',
      args_summary: JSON.stringify({ failing_days: DISABLE_AFTER_DAYS }),
      correlation_id: randomUUID(),
    })
    .execute();
}

// Returns true when this failure disabled the endpoint.
async function recordFailure(trx: TenantDb, claimed: Claimed): Promise<boolean> {
  const endpoint = await trx
    .selectFrom('webhook_endpoints')
    .select([
      'enabled',
      sql<boolean>`coalesce(failing_since <= now() - make_interval(days => ${DISABLE_AFTER_DAYS}), false)`.as(
        'overdue',
      ),
    ])
    .where('workspace_id', '=', claimed.workspaceId)
    .where('id', '=', claimed.endpointId)
    .forUpdate()
    .executeTakeFirst();
  if (endpoint === undefined) return false;
  const disable = endpoint.enabled && endpoint.overdue;
  await trx
    .updateTable('webhook_endpoints')
    .set({
      consecutive_failures: sql<number>`consecutive_failures + 1`,
      failing_since: sql<Date>`coalesce(failing_since, now())`,
      ...(disable
        ? { enabled: false, disabled_reason: 'failing', updated_at: sql<Date>`now()` }
        : {}),
    })
    .where('workspace_id', '=', claimed.workspaceId)
    .where('id', '=', claimed.endpointId)
    .execute();
  if (disable) await auditDisabled(trx, claimed);
  return disable;
}

// Fenced by the attempt count: a claim that lost its lease to a later one records nothing.
export async function finishDelivery(
  deps: { readonly db: Database; readonly logger: Logger },
  claimed: Claimed,
  outcome: SendOutcome,
): Promise<Finished> {
  const { workspaceId, deliveryId, endpointId } = claimed;
  const result = await deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const update = deliveryUpdate(claimed, outcome);
    const updated = await trx
      .updateTable('webhook_deliveries')
      .set({ ...update, updated_at: sql<Date>`now()` })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', deliveryId)
      .where('state', '=', 'delivering')
      .where('attempt_count', '=', claimed.attempt)
      .executeTakeFirst();
    if (Number(updated.numUpdatedRows) === 0)
      return { finished: 'stale' as const, disabled: false };
    if (outcome.ok) {
      await recordSuccess(trx, claimed);
      return { finished: 'delivered' as const, disabled: false };
    }
    const disabled = outcome.error === 'internal' ? false : await recordFailure(trx, claimed);
    return { finished: update.state === 'dead' ? ('dead' as const) : ('retry' as const), disabled };
  });
  if (result.disabled) {
    deps.logger.warn(
      { workspaceId, endpointId, failingDays: DISABLE_AFTER_DAYS },
      'webhook endpoint disabled after failing every delivery',
    );
  }
  return result.finished;
}
