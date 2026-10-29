import type { PostMetric, ProviderError } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { pullSteps } from './seed.ts';

export const MAX_ATTEMPTS = 3;
const MAX_DEFER_HOURS = 3;

export interface DueRow {
  readonly destinationId: string;
  readonly accountId: string;
  readonly provider: string;
  readonly remoteId: string;
  readonly postType: string;
  readonly publishedAt: Temporal.Instant;
  readonly step: number;
  readonly attempts: number;
}

export interface Snapshot {
  readonly destinationId: string;
  readonly metric: PostMetric;
  readonly value: number | null;
}

export interface Provenance {
  readonly provider: string;
  readonly apiVersion: string;
  readonly observedAt: Date;
}

function instant(at: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(at.getTime());
}

export function snapshotKey(destinationId: string, metric: string): string {
  return `${destinationId}\n${metric}`;
}

export function storedValue(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export interface DueLimits {
  readonly total: number;
  readonly perChannel: number;
}

function rankedDue(trx: TenantDb, workspaceId: string, now: Date) {
  return trx
    .selectFrom('destination_metric_pulls as p')
    .innerJoin('post_destinations as d', (join) =>
      join.onRef('d.workspace_id', '=', 'p.workspace_id').onRef('d.id', '=', 'p.destination_id'),
    )
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .select((eb) => [
      'p.destination_id',
      'p.step',
      'p.attempts',
      'p.next_pull_at',
      'd.social_account_id',
      'd.provider',
      'd.remote_id',
      'd.publish_type',
      'd.published_at',
      eb.fn
        .agg<string>('row_number')
        .over((ob) =>
          ob
            .partitionBy('d.social_account_id')
            .orderBy('p.next_pull_at')
            .orderBy('p.destination_id'),
        )
        .as('rank'),
    ])
    .where('p.workspace_id', '=', workspaceId)
    .where('p.next_pull_at', 'is not', null)
    .where('p.next_pull_at', '<=', now)
    .where('d.state', '=', 'published')
    .where('d.remote_id', 'is not', null)
    .where('d.published_at', 'is not', null)
    .where('a.status', '=', 'active');
}

export async function dueRows(
  trx: TenantDb,
  workspaceId: string,
  now: Date,
  limits: DueLimits,
): Promise<DueRow[]> {
  const rows = await trx
    .selectFrom(rankedDue(trx, workspaceId, now).as('due'))
    .select([
      'destination_id',
      'step',
      'attempts',
      'social_account_id',
      'provider',
      'remote_id',
      'publish_type',
      'published_at',
    ])
    .where('rank', '<=', String(limits.perChannel))
    .orderBy('next_pull_at')
    .orderBy('destination_id')
    .limit(limits.total)
    .execute();
  return rows.flatMap((row) =>
    row.remote_id === null || row.published_at === null
      ? []
      : [
          {
            destinationId: row.destination_id,
            accountId: row.social_account_id,
            provider: row.provider,
            remoteId: row.remote_id,
            postType: row.publish_type,
            publishedAt: instant(row.published_at),
            step: row.step,
            attempts: row.attempts,
          },
        ],
  );
}

export async function latestSnapshots(
  trx: TenantDb,
  workspaceId: string,
  destinationIds: readonly string[],
): Promise<Map<string, number | null>> {
  if (destinationIds.length === 0) return new Map();
  const rows = await trx
    .selectFrom('post_metric_snapshots')
    .distinctOn(['destination_id', 'metric'])
    .select(['destination_id', 'metric', 'value'])
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinationIds)
    .orderBy('destination_id')
    .orderBy('metric')
    .orderBy('observed_at', 'desc')
    .execute();
  return new Map(
    rows.map((row) => [snapshotKey(row.destination_id, row.metric), storedValue(row.value)]),
  );
}

export async function insertSnapshots(
  trx: TenantDb,
  workspaceId: string,
  snapshots: readonly Snapshot[],
  provenance: Provenance,
): Promise<number> {
  if (snapshots.length === 0) return 0;
  const result = await trx
    .insertInto('post_metric_snapshots')
    .values(
      snapshots.map((snapshot) => ({
        workspace_id: workspaceId,
        destination_id: snapshot.destinationId,
        metric: snapshot.metric,
        value: snapshot.value,
        observed_at: provenance.observedAt,
        provider: provenance.provider,
        api_version: provenance.apiVersion,
      })),
    )
    .onConflict((oc) => oc.doNothing())
    .executeTakeFirst();
  return Number(result.numInsertedOrUpdatedRows ?? 0n);
}

export type PullOutcome = 'advance' | 'transient' | 'done';

export interface PullScope {
  readonly workspaceId: string;
  readonly now: Temporal.Instant;
  readonly windowHours?: number | undefined;
}

function nextPullAt(row: DueRow, outcome: PullOutcome, scope: PullScope) {
  if (outcome !== 'done') {
    for (const [step, hours] of pullSteps(scope.windowHours)) {
      const at = row.publishedAt.add({ hours });
      if (step > row.step && Temporal.Instant.compare(at, scope.now) > 0) {
        return { step, at: new Date(at.epochMilliseconds) };
      }
    }
  }
  return { step: row.step, at: null };
}

export async function settlePull(
  trx: TenantDb,
  scope: PullScope,
  row: DueRow,
  outcome: PullOutcome,
): Promise<PullOutcome> {
  const retry = outcome === 'transient' && row.attempts + 1 < MAX_ATTEMPTS;
  const settled = outcome === 'transient' && !retry ? 'advance' : outcome;
  const next = nextPullAt(row, settled, scope);
  await trx
    .updateTable('destination_metric_pulls')
    .set(
      retry
        ? { attempts: sql<number>`attempts + 1` }
        : { step: next.step, next_pull_at: next.at, attempts: 0 },
    )
    .where('workspace_id', '=', scope.workspaceId)
    .where('destination_id', '=', row.destinationId)
    .where('step', '=', row.step)
    .where('attempts', '=', row.attempts)
    .execute();
  if (retry) return 'transient';
  return next.at === null ? 'done' : 'advance';
}

export function resumeAt(now: Temporal.Instant, error: ProviderError | null): Date {
  if (error?.kind !== 'rate_limited') return new Date(now.add({ hours: 1 }).epochMilliseconds);
  const floor = now.add({ minutes: 15 });
  const ceiling = now.add({ hours: MAX_DEFER_HOURS });
  const reset = Temporal.Instant.compare(error.resetAt, ceiling) < 0 ? error.resetAt : ceiling;
  const at = Temporal.Instant.compare(reset, floor) > 0 ? reset : floor;
  return new Date(at.epochMilliseconds);
}

export async function deferPulls(
  trx: TenantDb,
  scope: PullScope,
  rows: readonly DueRow[],
  error: ProviderError | null,
): Promise<void> {
  if (rows.length === 0) return;
  await trx
    .updateTable('destination_metric_pulls')
    .set({ next_pull_at: resumeAt(scope.now, error) })
    .where('workspace_id', '=', scope.workspaceId)
    .where(
      'destination_id',
      'in',
      rows.map((row) => row.destinationId),
    )
    .where('next_pull_at', 'is not', null)
    .execute();
}
