import type { Actor, Database } from '@kronaut/db';
import { type CronItem, type ParsedCronItem, parseCronItems, type TaskList } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { refreshCapabilities } from './channels/capabilities-refresh.ts';
import { purgeDisconnectedCredentials } from './channels/retention.ts';
import { type EmailDeps, emailNotifications } from './notifications/email.ts';
import { purgeNotifications } from './notifications/retention.ts';
import { type RefreshDeps, refreshExpiring } from './publish/refresh.ts';
import { reapLeases, reconcile, type SweepDeps, sweepDue } from './publish/sweeps.ts';

export const CRON_TASKS = {
  accountCapabilitiesRefresh: 'account_capabilities_refresh',
  auditMaintenance: 'audit_maintenance',
  credentialRefresh: 'credential_refresh',
  credentialRetention: 'credential_retention',
  notificationEmail: 'notification_email',
  notificationRetention: 'notification_retention',
  publishDueSweep: 'publish_due_sweep',
  publishLeaseReaper: 'publish_lease_reaper',
  publishReconcile: 'publish_reconcile',
} as const;

const SYSTEM: Actor = { kind: 'system' };
const DAY_MS = 86_400_000;
const AUDIT_BATCH = 10_000;
const AUDIT_MAX_BATCHES = 100;
const DETAIL_MAX = 500;

const CRON_ITEMS: readonly CronItem[] = [
  {
    task: CRON_TASKS.accountCapabilitiesRefresh,
    identifier: CRON_TASKS.accountCapabilitiesRefresh,
    match: '37 4 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.auditMaintenance,
    identifier: CRON_TASKS.auditMaintenance,
    match: '17 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.credentialRefresh,
    identifier: CRON_TASKS.credentialRefresh,
    match: '*/5 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.credentialRetention,
    identifier: CRON_TASKS.credentialRetention,
    match: '51 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.notificationEmail,
    identifier: CRON_TASKS.notificationEmail,
    match: '* * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.notificationRetention,
    identifier: CRON_TASKS.notificationRetention,
    match: '43 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.publishDueSweep,
    identifier: CRON_TASKS.publishDueSweep,
    match: '* * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.publishLeaseReaper,
    identifier: CRON_TASKS.publishLeaseReaper,
    match: '* * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.publishReconcile,
    identifier: CRON_TASKS.publishReconcile,
    match: '*/10 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
];

export function cronItems(email: boolean): ParsedCronItem[] {
  return parseCronItems(
    CRON_ITEMS.filter((item) => email || item.task !== CRON_TASKS.notificationEmail),
  );
}

export async function recordCronRun(
  db: Database,
  task: string,
  run: () => Promise<string>,
): Promise<void> {
  const { id } = await db.withActor(SYSTEM, (trx) =>
    trx.insertInto('cron_runs').values({ task }).returning('id').executeTakeFirstOrThrow(),
  );
  let outcome: 'ok' | 'error' = 'error';
  let detail = '';
  try {
    detail = await run();
    outcome = 'ok';
  } catch (err) {
    detail = err instanceof Error ? err.message : 'failed';
    throw err;
  } finally {
    await db.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('cron_runs')
        .set({ finished_at: sql<Date>`now()`, outcome, detail: detail.slice(0, DETAIL_MAX) })
        .where('id', '=', id)
        .execute(),
    );
  }
}

export async function maintainAuditPartitions(db: Database, logger: Logger): Promise<string> {
  const totals: Record<string, number> = {};
  let drained = false;
  for (let batch = 0; batch < AUDIT_MAX_BATCHES && !drained; batch++) {
    const rows = await db.withActor(SYSTEM, async (trx) => {
      const result = await sql<{ relation: string; affected: string }>`
        select relation, affected from maintain_audit_partitions(${AUDIT_BATCH})
      `.execute(trx);
      return result.rows;
    });
    let pii = 0;
    for (const row of rows) {
      const affected = Number(row.affected);
      if (row.relation === 'audit_events_default') totals[row.relation] = affected;
      else totals[row.relation] = (totals[row.relation] ?? 0) + affected;
      if (row.relation === 'audit_events.pii') pii = affected;
    }
    drained = pii < AUDIT_BATCH;
  }
  const stranded = totals.audit_events_default ?? 0;
  if (stranded > 0) {
    logger.error(
      { task: CRON_TASKS.auditMaintenance, rows: stranded },
      'audit_events_default holds rows; their months cannot get a partition',
    );
  }
  if (!drained) {
    throw new Error(
      `audit PII nulling stopped at the ${AUDIT_MAX_BATCHES}-batch cap: ${JSON.stringify(totals)}`,
    );
  }
  return JSON.stringify(totals);
}

export function cronTaskList(
  db: Database,
  logger: Logger,
  sweeps: SweepDeps & RefreshDeps,
  email: EmailDeps | null = null,
): TaskList {
  return {
    ...(email === null
      ? {}
      : {
          [CRON_TASKS.notificationEmail]: async () => {
            await recordCronRun(db, CRON_TASKS.notificationEmail, () => emailNotifications(email));
          },
        }),
    [CRON_TASKS.accountCapabilitiesRefresh]: async () => {
      await recordCronRun(db, CRON_TASKS.accountCapabilitiesRefresh, () =>
        refreshCapabilities(sweeps),
      );
    },
    [CRON_TASKS.auditMaintenance]: async () => {
      await recordCronRun(db, CRON_TASKS.auditMaintenance, () =>
        maintainAuditPartitions(db, logger),
      );
    },
    [CRON_TASKS.credentialRefresh]: async () => {
      await recordCronRun(db, CRON_TASKS.credentialRefresh, () => refreshExpiring(sweeps));
    },
    [CRON_TASKS.credentialRetention]: async () => {
      await recordCronRun(db, CRON_TASKS.credentialRetention, () =>
        purgeDisconnectedCredentials(db),
      );
    },
    [CRON_TASKS.notificationRetention]: async () => {
      await recordCronRun(db, CRON_TASKS.notificationRetention, () => purgeNotifications(db));
    },
    [CRON_TASKS.publishDueSweep]: async () => {
      await recordCronRun(db, CRON_TASKS.publishDueSweep, () => sweepDue(sweeps));
    },
    [CRON_TASKS.publishLeaseReaper]: async () => {
      await recordCronRun(db, CRON_TASKS.publishLeaseReaper, () => reapLeases(sweeps));
    },
    [CRON_TASKS.publishReconcile]: async () => {
      await recordCronRun(db, CRON_TASKS.publishReconcile, () => reconcile(sweeps));
    },
  };
}
