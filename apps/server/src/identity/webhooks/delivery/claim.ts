import type { Actor, Database, SweepRow, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { SealedWebhookSecrets } from '../../../infrastructure/credentials/webhook-secret.ts';
import { LEASE_SECONDS, MAX_ATTEMPTS } from './schedule.ts';

const SYSTEM: Actor = { kind: 'system' };

export interface Claimed {
  readonly workspaceId: string;
  readonly deliveryId: string;
  readonly endpointId: string;
  readonly eventId: string;
  readonly attempt: number;
  readonly url: string;
  readonly body: string;
  readonly sealed: SealedWebhookSecrets;
  readonly withPrevious: boolean;
}

type DueDelivery = NonNullable<Awaited<ReturnType<typeof lockDue>>>;

function lockDue(trx: TenantDb, row: SweepRow) {
  return trx
    .selectFrom('webhook_deliveries as d')
    .innerJoin('webhook_endpoints as e', (join) =>
      join.onRef('e.workspace_id', '=', 'd.workspace_id').onRef('e.id', '=', 'd.endpoint_id'),
    )
    .innerJoin('webhook_events as v', (join) =>
      join.onRef('v.workspace_id', '=', 'd.workspace_id').onRef('v.id', '=', 'd.event_id'),
    )
    .select([
      'd.attempt_count',
      'd.endpoint_id',
      'd.event_id',
      'e.enabled',
      'e.url',
      'e.secret_ciphertext',
      'e.secret_nonce',
      'e.secret_wrapped_dek',
      'e.kek_version',
      'e.previous_secret_ciphertext',
      'e.previous_secret_nonce',
      'e.previous_secret_wrapped_dek',
      sql<boolean>`coalesce(e.previous_secret_expires_at > now(), false)`.as('with_previous'),
      sql<string>`v.payload::text`.as('body'),
    ])
    .where('d.workspace_id', '=', row.workspaceId)
    .where('d.id', '=', row.id)
    .where('d.state', 'in', ['pending', 'retry_wait', 'delivering'])
    .where(sql<boolean>`d.next_attempt_at <= now()`)
    .where(sql<boolean>`not instance_paused()`)
    .forUpdate('d')
    .skipLocked()
    .executeTakeFirst();
}

async function bury(trx: TenantDb, row: SweepRow, reason: string): Promise<null> {
  await trx
    .updateTable('webhook_deliveries')
    .set({ state: 'dead', last_error: reason, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', row.workspaceId)
    .where('id', '=', row.id)
    .execute();
  return null;
}

function claimedOf(row: SweepRow, due: DueDelivery, attempt: number): Claimed {
  return {
    workspaceId: row.workspaceId,
    deliveryId: row.id,
    endpointId: due.endpoint_id,
    eventId: due.event_id,
    attempt,
    url: due.url,
    body: due.body,
    sealed: due,
    withPrevious: due.with_previous,
  };
}

// The claim commits before the send and holds the row until next_attempt_at, so a crash mid-send only delays it.
export async function claimDelivery(db: Database, row: SweepRow): Promise<Claimed | null> {
  return await db.withTenant(row.workspaceId, SYSTEM, async (trx) => {
    const due = await lockDue(trx, row);
    if (due === undefined) return null;
    if (!due.enabled) return await bury(trx, row, 'endpoint_disabled');
    if (due.attempt_count >= MAX_ATTEMPTS) return await bury(trx, row, 'interrupted');
    const { attempt_count: attempt } = await trx
      .updateTable('webhook_deliveries')
      .set({
        state: 'delivering',
        attempt_count: sql<number>`attempt_count + 1`,
        next_attempt_at: sql<Date>`now() + make_interval(secs => ${LEASE_SECONDS})`,
        updated_at: sql<Date>`now()`,
      })
      .where('workspace_id', '=', row.workspaceId)
      .where('id', '=', row.id)
      .returning('attempt_count')
      .executeTakeFirstOrThrow();
    return claimedOf(row, due, attempt);
  });
}
