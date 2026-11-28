import type { Database } from '@kronaut/db';
import { createHttpClient, type HttpClient } from '@kronaut/egress';
import { type CronItem, type ParsedCronItem, parseCronItems, type TaskList } from 'graphile-worker';
import type { Logger } from 'pino';
import { refreshCapabilities } from './access/channels/capabilities-refresh.ts';
import { purgeDisconnectedCredentials } from './access/channels/retention.ts';
import { fillEvergreen } from './actors/evergreen/fill.ts';
import { collectMedia, type MediaGcDeps } from './actors/media/gc.ts';
import { feedCheckTask } from './actors/rss-feeds/check.ts';
import { RSS_EGRESS } from './actors/rss-feeds/fetch.ts';
import { pollFeeds } from './actors/rss-feeds/poll.ts';
import { advanceSeries } from './actors/series/advance.ts';
import { purgeInstanceRetention } from './actors/system/instance-retention.ts';
import { checkApiVersionSunsets } from './actors/system/sunset.ts';
import { recomputeTimes } from './flow/posts/schedule/tz-recompute.ts';
import { type DeliveryDeps, deliverWebhooks } from './identity/webhooks/delivery/deliver.ts';
import { WEBHOOK_EGRESS } from './identity/webhooks/delivery/egress.ts';
import { purgeWebhookEvents } from './identity/webhooks/retention.ts';
import { maintainAuditPartitions } from './infrastructure/jobs/audit-maintenance.ts';
import { recordCronRun } from './infrastructure/jobs/cron-run.ts';
import { CRON_TASKS, type CronTask, DAY_MS } from './infrastructure/jobs/cron-tasks.ts';
import { purgeIdempotencyKeys } from './infrastructure/jobs/idempotency-retention.ts';
import { JOBS } from './infrastructure/jobs/jobs.ts';
import { pullAnalytics } from './records/analytics/pull.ts';
import { type EmailDeps, emailNotifications } from './records/notifications/email.ts';
import { purgeNotifications } from './records/notifications/retention.ts';
import { purgeShortLinks } from './records/short-links/gc.ts';
import { flagAccount } from './steps/publish/incidents.ts';
import { type RefreshDeps, refreshExpiring } from './steps/publish/refresh/refresh.ts';
import { reapLeases, reconcile, type SweepDeps, sweepDue } from './steps/publish/sweeps.ts';

const CRON_ITEMS: readonly CronItem[] = [
  {
    task: CRON_TASKS.accountCapabilitiesRefresh,
    identifier: CRON_TASKS.accountCapabilitiesRefresh,
    match: '37 4 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.analyticsPull,
    identifier: CRON_TASKS.analyticsPull,
    match: '11,26,41,56 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.apiVersionSunset,
    identifier: CRON_TASKS.apiVersionSunset,
    match: '7 5 * * *',
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
    task: CRON_TASKS.evergreenFill,
    identifier: CRON_TASKS.evergreenFill,
    match: '41 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.idempotencyRetention,
    identifier: CRON_TASKS.idempotencyRetention,
    match: '33 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.instanceRetention,
    identifier: CRON_TASKS.instanceRetention,
    match: '29 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
  {
    task: CRON_TASKS.mediaGc,
    identifier: CRON_TASKS.mediaGc,
    match: '23 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
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
  {
    task: CRON_TASKS.rssPoll,
    identifier: CRON_TASKS.rssPoll,
    match: '4,19,34,49 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.seriesAdvance,
    identifier: CRON_TASKS.seriesAdvance,
    match: '*/5 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.tzRecompute,
    identifier: CRON_TASKS.tzRecompute,
    match: '7 * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.webhookDelivery,
    identifier: CRON_TASKS.webhookDelivery,
    match: '* * * * *',
    options: { backfillPeriod: 0, maxAttempts: 1 },
  },
  {
    task: CRON_TASKS.webhookRetention,
    identifier: CRON_TASKS.webhookRetention,
    match: '47 3 * * *',
    options: { backfillPeriod: DAY_MS, maxAttempts: 3 },
  },
];

function registeredItems(email: boolean): CronItem[] {
  return CRON_ITEMS.filter((item) => email || item.task !== CRON_TASKS.notificationEmail);
}

export function cronItems(email: boolean): ParsedCronItem[] {
  return parseCronItems(registeredItems(email));
}

export function cronTasks(email: boolean): CronTask[] {
  return registeredItems(email).map((item) => item.task as CronTask);
}

export type CronDeps = SweepDeps &
  RefreshDeps &
  MediaGcDeps & { readonly webhookHttp?: HttpClient };

function webhookDeps(db: Database, logger: Logger, sweeps: CronDeps): DeliveryDeps {
  const http = sweeps.webhookHttp ?? createHttpClient(WEBHOOK_EGRESS);
  return { db, logger, keyring: sweeps.keyring, now: sweeps.now, http };
}

export function cronTaskList(
  db: Database,
  logger: Logger,
  sweeps: CronDeps,
  email: EmailDeps | null = null,
): TaskList {
  const webhooks = webhookDeps(db, logger, sweeps);
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
    [CRON_TASKS.analyticsPull]: async () => {
      await recordCronRun(db, CRON_TASKS.analyticsPull, () =>
        pullAnalytics({ ...sweeps, flagAccount }),
      );
    },
    [CRON_TASKS.apiVersionSunset]: async () => {
      await recordCronRun(db, CRON_TASKS.apiVersionSunset, async () =>
        checkApiVersionSunsets(sweeps.providers, logger, sweeps.now()),
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
      await recordCronRun(db, CRON_TASKS.credentialRetention, async () =>
        JSON.stringify({
          ...JSON.parse(await purgeDisconnectedCredentials(db, sweeps.providers)),
          shortLinks: await purgeShortLinks(db),
        }),
      );
    },
    [CRON_TASKS.evergreenFill]: async () => {
      await recordCronRun(db, CRON_TASKS.evergreenFill, () => fillEvergreen(sweeps));
    },
    [CRON_TASKS.idempotencyRetention]: async () => {
      await recordCronRun(db, CRON_TASKS.idempotencyRetention, () =>
        purgeIdempotencyKeys({ db, logger }),
      );
    },
    [CRON_TASKS.instanceRetention]: async () => {
      await recordCronRun(db, CRON_TASKS.instanceRetention, () => purgeInstanceRetention(db));
    },
    [CRON_TASKS.mediaGc]: async () => {
      await recordCronRun(db, CRON_TASKS.mediaGc, () => collectMedia(db, sweeps));
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
    [CRON_TASKS.rssPoll]: async () => {
      await recordCronRun(db, CRON_TASKS.rssPoll, () => pollFeeds(sweeps));
    },
    [JOBS.rss]: feedCheckTask({ ...sweeps, http: createHttpClient(RSS_EGRESS) }),
    [CRON_TASKS.seriesAdvance]: async () => {
      await recordCronRun(db, CRON_TASKS.seriesAdvance, () => advanceSeries(sweeps));
    },
    [CRON_TASKS.tzRecompute]: async () => {
      await recordCronRun(db, CRON_TASKS.tzRecompute, () => recomputeTimes(db, logger));
    },
    [CRON_TASKS.webhookDelivery]: async () => {
      await recordCronRun(db, CRON_TASKS.webhookDelivery, () => deliverWebhooks(webhooks));
    },
    [CRON_TASKS.webhookRetention]: async () => {
      await recordCronRun(db, CRON_TASKS.webhookRetention, () => purgeWebhookEvents(webhooks));
    },
  };
}
