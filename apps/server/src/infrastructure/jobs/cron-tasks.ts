export const CRON_TASKS = {
  accountCapabilitiesRefresh: 'account_capabilities_refresh',
  analyticsPull: 'analytics_pull',
  apiVersionSunset: 'api_version_sunset',
  auditMaintenance: 'audit_maintenance',
  credentialRefresh: 'credential_refresh',
  credentialRetention: 'credential_retention',
  evergreenFill: 'evergreen_fill',
  instanceRetention: 'instance_retention',
  mediaGc: 'media_gc',
  notificationEmail: 'notification_email',
  notificationRetention: 'notification_retention',
  publishDueSweep: 'publish_due_sweep',
  publishLeaseReaper: 'publish_lease_reaper',
  publishReconcile: 'publish_reconcile',
  seriesAdvance: 'series_advance',
  tzRecompute: 'tz_recompute',
} as const;

export type CronTask = (typeof CRON_TASKS)[keyof typeof CRON_TASKS];

export const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export const CRON_INTERVAL_MS: Readonly<Record<CronTask, number>> = {
  [CRON_TASKS.accountCapabilitiesRefresh]: DAY_MS,
  [CRON_TASKS.analyticsPull]: 15 * MINUTE_MS,
  [CRON_TASKS.apiVersionSunset]: DAY_MS,
  [CRON_TASKS.auditMaintenance]: DAY_MS,
  [CRON_TASKS.credentialRefresh]: 5 * MINUTE_MS,
  [CRON_TASKS.credentialRetention]: DAY_MS,
  [CRON_TASKS.evergreenFill]: 60 * MINUTE_MS,
  [CRON_TASKS.instanceRetention]: DAY_MS,
  [CRON_TASKS.mediaGc]: 60 * MINUTE_MS,
  [CRON_TASKS.notificationEmail]: MINUTE_MS,
  [CRON_TASKS.notificationRetention]: DAY_MS,
  [CRON_TASKS.publishDueSweep]: MINUTE_MS,
  [CRON_TASKS.publishLeaseReaper]: MINUTE_MS,
  [CRON_TASKS.publishReconcile]: 10 * MINUTE_MS,
  [CRON_TASKS.seriesAdvance]: 5 * MINUTE_MS,
  [CRON_TASKS.tzRecompute]: 60 * MINUTE_MS,
};
