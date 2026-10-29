import type { PostMetric } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { PULL_OFFSETS_HOURS } from './seed.ts';

export const MAX_ATTEMPTS = 3;

export interface DueRow {
  readonly destinationId: string;
  readonly accountId: string;
  readonly provider: string;
  readonly remoteId: string;
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

export async function dueRows(
  trx: TenantDb,
  workspaceId: string,
  now: Date,
  limit: number,
): Promise<DueRow[]> {
  const rows = await trx
    .selectFrom('destination_metric_pulls as p')
    .innerJoin('post_destinations as d', (join) =>
      join.onRef('d.workspace_id', '=', 'p.workspace_id').onRef('d.id', '=', 'p.destination_id'),
    )
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .select([
      'p.destination_id',
      'p.step',
      'p.attempts',
      'd.social_account_id',
      'd.provider',
      'd.remote_id',
      'd.published_at',
    ])
    .where('p.workspace_id', '=', workspaceId)
    .where('p.next_pull_at', 'is not', null)
    .where('p.next_pull_at', '<=', now)
    .where('d.state', '=', 'published')
    .where('d.remote_id', 'is not', null)
    .where('d.published_at', 'is not', null)
    .where('a.status', '=', 'active')
    .orderBy('p.next_pull_at')
    .orderBy('p.destination_id')
    .limit(limit)
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

function nextPullAt(row: DueRow, outcome: PullOutcome): { step: number; at: Date | null } {
  if (outcome === 'done') return { step: row.step, at: null };
  const step = row.step + 1;
  const hours = PULL_OFFSETS_HOURS[step];
  if (hours === undefined) return { step: row.step, at: null };
  return { step, at: new Date(row.publishedAt.add({ hours }).epochMilliseconds) };
}

export async function settlePull(
  trx: TenantDb,
  workspaceId: string,
  row: DueRow,
  outcome: PullOutcome,
): Promise<PullOutcome> {
  const retry = outcome === 'transient' && row.attempts + 1 < MAX_ATTEMPTS;
  const settled = outcome === 'transient' && !retry ? 'advance' : outcome;
  const next = nextPullAt(row, settled);
  await trx
    .updateTable('destination_metric_pulls')
    .set(
      retry
        ? { attempts: sql<number>`attempts + 1` }
        : { step: next.step, next_pull_at: next.at, attempts: 0 },
    )
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', '=', row.destinationId)
    .where('step', '=', row.step)
    .where('attempts', '=', row.attempts)
    .execute();
  if (retry) return 'transient';
  return next.at === null ? 'done' : 'advance';
}
