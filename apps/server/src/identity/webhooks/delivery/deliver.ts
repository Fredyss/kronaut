import type { Keyring } from '@kronaut/credentials';
import type { Database, SweepRow } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { openWebhookSecrets } from '../../../infrastructure/credentials/webhook-secret.ts';
import { type Claimed, claimDelivery } from './claim.ts';
import { postWebhook, type SendOutcome } from './egress.ts';
import { type Finished, finishDelivery } from './finish.ts';
import { webhookHeaders } from './sign.ts';

export interface DeliveryDeps {
  readonly db: Database;
  readonly keyring: Keyring;
  readonly http: HttpClient;
  readonly logger: Logger;
  readonly now: () => Temporal.Instant;
}

const BATCH = 200;
const PARALLEL = 8;
const CLAIM_BUDGET_MS = 40_000;

type Counted = Finished | 'skipped' | 'failed';

async function send(deps: DeliveryDeps, claimed: Claimed): Promise<SendOutcome> {
  let headers: Record<string, string>;
  try {
    const aad = { endpointId: claimed.endpointId, workspaceId: claimed.workspaceId };
    const secrets = openWebhookSecrets(deps.keyring, aad, claimed.sealed, claimed.withPrevious);
    const timestamp = Math.floor(deps.now().epochMilliseconds / 1000);
    headers = webhookHeaders(secrets, { id: claimed.eventId, timestamp, body: claimed.body });
  } catch (error) {
    deps.logger.error(
      { deliveryId: claimed.deliveryId, errName: error instanceof Error ? error.name : 'unknown' },
      'a webhook delivery could not be signed',
    );
    return { ok: false, status: null, error: 'internal' };
  }
  return await postWebhook(deps.http, { url: claimed.url, headers, body: claimed.body });
}

async function deliverOne(deps: DeliveryDeps, row: SweepRow): Promise<Counted> {
  const claimed = await claimDelivery(deps.db, row);
  if (claimed === null) return 'skipped';
  const outcome = await send(deps, claimed);
  if (!outcome.ok) {
    deps.logger.info(
      {
        deliveryId: claimed.deliveryId,
        endpointId: claimed.endpointId,
        attempt: claimed.attempt,
        status: outcome.status,
        code: outcome.error,
      },
      'webhook delivery failed',
    );
  }
  return await finishDelivery(deps, claimed, outcome);
}

// One busy workspace must not fill every lane before the others get a turn.
function byWorkspaceTurns(rows: readonly SweepRow[]): SweepRow[] {
  const queues = new Map<string, SweepRow[]>();
  for (const row of rows)
    queues.set(row.workspaceId, [...(queues.get(row.workspaceId) ?? []), row]);
  const turns: SweepRow[] = [];
  for (let round = 0; turns.length < rows.length; round++) {
    for (const queue of queues.values()) {
      const row = queue[round];
      if (row !== undefined) turns.push(row);
    }
  }
  return turns;
}

// Runs share the job worker with publishing, so a run stops claiming before the next cron tick and never holds more than one slot.
async function inParallel<T>(
  items: readonly T[],
  width: number,
  open: () => boolean,
  run: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lane = async (): Promise<void> => {
    while (open()) {
      const item = items[next++];
      if (item === undefined) return;
      await run(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, lane));
}

export async function deliverWebhooks(deps: DeliveryDeps): Promise<string> {
  const rows = await deps.db.sweeps.dueWebhookDeliveries(BATCH);
  const counts: Record<Counted, number> = {
    delivered: 0,
    retry: 0,
    dead: 0,
    stale: 0,
    skipped: 0,
    failed: 0,
  };
  const deadline = deps.now().epochMilliseconds + CLAIM_BUDGET_MS;
  const open = () => deps.now().epochMilliseconds < deadline;
  await inParallel(byWorkspaceTurns(rows), PARALLEL, open, async (row) => {
    try {
      counts[await deliverOne(deps, row)]++;
    } catch (err) {
      counts.failed++;
      deps.logger.error({ err, deliveryId: row.id }, 'webhook delivery could not be recorded');
    }
  });
  return JSON.stringify(counts);
}
