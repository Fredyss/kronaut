import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { CRON_INTERVAL_MS, type CronTask } from '../cron.ts';

export const SLO_TARGETS = { onTimePct: 99.5, duplicates: 0, unconfirmedPct: 0.5 } as const;

const DAY_MS = 86_400_000;
const INCIDENT_RECENT_DAYS = 7;
const INCIDENT_LIMIT = 50;
const Instant = z.iso.datetime();
const Pct = z.number().nullable();

export const SloWindowSchema = z.object({
  autoTotal: z.number().int(),
  onTimePct: Pct,
  duplicates: z.number().int(),
  unconfirmedPct: Pct,
});

export const CronStatusSchema = z.object({
  task: z.string(),
  startedAt: Instant.nullable(),
  finishedAt: Instant.nullable(),
  outcome: z.enum(['ok', 'error']).nullable(),
  detail: z.string().nullable(),
  stale: z.boolean(),
});

export const IncidentSchema = z.object({
  provider: z.string(),
  kind: z.string(),
  openedAt: Instant,
  lastSeenAt: Instant,
  occurrences: z.number().int(),
  resolvedAt: Instant.nullable(),
  detailCode: z.string().nullable(),
});

type SloWindow = z.input<typeof SloWindowSchema>;
type CronStatus = z.input<typeof CronStatusSchema>;
type Incident = z.input<typeof IncidentSchema>;

interface SloRow {
  readonly auto_total: string;
  readonly on_time: string;
  readonly unconfirmed: string;
  readonly provider_5xx: string;
  readonly duplicates: string;
}

function pct(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}

async function sloWindow(trx: TenantDb, from: Date, to: Date): Promise<SloWindow> {
  const { rows } = await sql<SloRow>`
    select auto_total, on_time, unconfirmed, provider_5xx, duplicates
      from slo_publish_stats(${from}, ${to})
  `.execute(trx);
  const row = rows[0];
  const total = Number(row?.auto_total ?? 0);
  return {
    autoTotal: total,
    onTimePct: pct(Number(row?.on_time ?? 0), total - Number(row?.provider_5xx ?? 0)),
    duplicates: Number(row?.duplicates ?? 0),
    unconfirmedPct: pct(Number(row?.unconfirmed ?? 0), total),
  };
}

export async function sloStatus(trx: TenantDb, now: Temporal.Instant) {
  const to = new Date(now.epochMilliseconds);
  return {
    targets: SLO_TARGETS,
    day: await sloWindow(trx, new Date(to.getTime() - DAY_MS), to),
    week: await sloWindow(trx, new Date(to.getTime() - 7 * DAY_MS), to),
  };
}

export async function cronStatus(
  trx: TenantDb,
  now: Temporal.Instant,
  registered: readonly CronTask[],
): Promise<CronStatus[]> {
  const tasks = [...registered].sort();
  const rows = await trx
    .selectFrom('cron_runs')
    .distinctOn('task')
    .select(['task', 'started_at', 'finished_at', 'outcome', 'detail'])
    .where('task', 'in', tasks)
    .orderBy('task')
    .orderBy('started_at', 'desc')
    .execute();
  const byTask = new Map(rows.map((row) => [row.task, row]));
  return tasks.map((task) => {
    const row = byTask.get(task);
    if (row === undefined) {
      return { task, startedAt: null, finishedAt: null, outcome: null, detail: null, stale: true };
    }
    const outcome = row.outcome === 'ok' || row.outcome === 'error' ? row.outcome : null;
    return {
      task,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at?.toISOString() ?? null,
      outcome,
      detail: outcome === 'error' ? row.detail : null,
      stale: now.epochMilliseconds - row.started_at.getTime() > 2 * CRON_INTERVAL_MS[task],
    };
  });
}

export async function incidentStatus(trx: TenantDb, now: Temporal.Instant): Promise<Incident[]> {
  const since = new Date(now.epochMilliseconds - INCIDENT_RECENT_DAYS * DAY_MS);
  const rows = await trx
    .selectFrom('provider_app_incidents as i')
    .innerJoin('provider_apps as a', 'a.id', 'i.provider_app_id')
    .select([
      'a.provider',
      'i.kind',
      'i.opened_at',
      'i.last_seen_at',
      'i.occurrences',
      'i.resolved_at',
      'i.detail_code',
    ])
    .where((eb) => eb.or([eb('i.resolved_at', 'is', null), eb('i.resolved_at', '>=', since)]))
    .orderBy('i.opened_at', 'desc')
    .orderBy('i.id', 'desc')
    .limit(INCIDENT_LIMIT)
    .execute();
  return rows.map((row) => ({
    provider: row.provider,
    kind: row.kind,
    openedAt: row.opened_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    occurrences: row.occurrences,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    detailCode: row.detail_code,
  }));
}
