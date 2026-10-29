import {
  type AnalyticsResult,
  encodePublicId,
  POST_METRICS,
  type PostMetrics,
  type ProviderError,
} from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { toProviderFailure } from '@kronaut/providers/failure';
import { createBaseContext, type ProviderEntry } from '../providers.ts';
import { sweepCron } from '../workspace-sweep.ts';
import { pullFollowers } from './followers.ts';
import { metricValue, type PullDeps, type Run, type Source, sourceOf } from './source.ts';
import {
  type DueRow,
  dueRows,
  insertSnapshots,
  latestSnapshots,
  type PullOutcome,
  type Snapshot,
  settlePull,
  snapshotKey,
} from './store.ts';

export type { PullDeps } from './source.ts';

const TASK = 'analytics_pull';
const MAX_ROWS = 100;
const SYSTEM: Actor = { kind: 'system' };
const STOP_KINDS: ReadonlySet<ProviderError['kind']> = new Set([
  'rate_limited',
  'auth_expired',
  'auth_revoked',
  'app_config',
]);

interface Channel {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly entry: ProviderEntry;
  readonly rows: readonly DueRow[];
  readonly source: Source;
}

type RowResult =
  | { readonly kind: 'metrics'; readonly metrics: PostMetrics }
  | { readonly kind: 'error'; readonly error: ProviderError };

function outcomeOf(result: RowResult): PullOutcome | null {
  if (result.kind === 'metrics') return 'advance';
  if (STOP_KINDS.has(result.error.kind)) return null;
  return result.error.kind === 'permanent' ? 'done' : 'transient';
}

function rowResult(result: AnalyticsResult, remoteId: string): RowResult {
  if (Object.hasOwn(result.posts, remoteId)) {
    return { kind: 'metrics', metrics: result.posts[remoteId] ?? {} };
  }
  const failed = result.failed ?? {};
  const error = Object.hasOwn(failed, remoteId) ? failed[remoteId] : undefined;
  return { kind: 'error', error: error ?? { kind: 'transient' } };
}

function changed(
  row: DueRow,
  metrics: PostMetrics,
  latest: ReadonlyMap<string, number | null>,
): Snapshot[] {
  return POST_METRICS.flatMap((metric) => {
    if (!Object.hasOwn(metrics, metric)) return [];
    const value = metricValue(metrics[metric]);
    const key = snapshotKey(row.destinationId, metric);
    if (latest.has(key) && latest.get(key) === value) return [];
    return [{ destinationId: row.destinationId, metric, value }];
  });
}

async function changedSnapshots(
  trx: TenantDb,
  channel: Channel,
  results: ReadonlyMap<DueRow, RowResult>,
): Promise<Snapshot[]> {
  const ids = channel.rows.map((row) => row.destinationId);
  const latest = await latestSnapshots(trx, channel.workspaceId, ids);
  return [...results].flatMap(([row, result]) =>
    result.kind === 'metrics' ? changed(row, result.metrics, latest) : [],
  );
}

async function settle(
  trx: TenantDb,
  run: Run,
  channel: Channel,
  results: ReadonlyMap<DueRow, RowResult>,
): Promise<void> {
  for (const [row, result] of results) {
    const outcome = outcomeOf(result);
    if (outcome === null) continue;
    run.counts.pulled++;
    const settled = await settlePull(trx, channel.workspaceId, row, outcome);
    if (settled === 'done') run.counts.done++;
    if (settled === 'transient') run.counts.retried++;
  }
}

async function write(
  run: Run,
  channel: Channel,
  results: ReadonlyMap<DueRow, RowResult>,
  apiVersion: string,
): Promise<void> {
  await run.deps.db.withTenant(channel.workspaceId, SYSTEM, async (trx) => {
    const snapshots = await changedSnapshots(trx, channel, results);
    run.counts.snapshots += await insertSnapshots(trx, channel.workspaceId, snapshots, {
      provider: channel.entry.manifest.id,
      apiVersion,
      observedAt: run.observedAt,
    });
    await settle(trx, run, channel, results);
  });
}

function stop(run: Run, channel: Channel, error: ProviderError): void {
  run.counts.stopped++;
  run.deps.logger.warn(
    {
      task: TASK,
      channel: encodePublicId('socialAccount', channel.accountId),
      reason: error.kind,
      rows: channel.rows.length,
    },
    'analytics pulls for a channel stopped for this run',
  );
}

async function fetchResults(
  run: Run,
  channel: Channel,
): Promise<{ results: Map<DueRow, RowResult>; apiVersion: string } | ProviderError> {
  const analytics = channel.entry.runtime.analytics;
  if (analytics === undefined) return { kind: 'app_config', code: 'analytics_unsupported' };
  const ctx = createBaseContext(
    channel.entry,
    run.deps.logger,
    new AbortController().signal,
    run.deps.now,
  );
  const remoteIds = [...new Set(channel.rows.map((row) => row.remoteId))];
  try {
    const result = await analytics(ctx, { ...channel.source, remoteIds });
    const results = new Map(channel.rows.map((row) => [row, rowResult(result, row.remoteId)]));
    return { results, apiVersion: result.apiVersion };
  } catch (err) {
    const error = toProviderFailure(err, 'none').error;
    if (STOP_KINDS.has(error.kind)) return error;
    const results = new Map(
      channel.rows.map((row): [DueRow, RowResult] => [row, { kind: 'error', error }]),
    );
    return { results, apiVersion: '' };
  }
}

async function pullChannel(run: Run, channel: Channel): Promise<void> {
  const fetched = await fetchResults(run, channel);
  if ('kind' in fetched) {
    stop(run, channel, fetched);
    return;
  }
  await write(run, channel, fetched.results, fetched.apiVersion);
}

function groupByChannel(rows: readonly DueRow[]): Map<string, DueRow[]> {
  const groups = new Map<string, DueRow[]>();
  for (const row of rows) {
    const group = groups.get(row.accountId) ?? [];
    group.push(row);
    groups.set(row.accountId, group);
  }
  return groups;
}

async function loadChannels(run: Run, workspaceId: string): Promise<Channel[]> {
  return await run.deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const rows = await dueRows(trx, workspaceId, run.observedAt, MAX_ROWS);
    const channels: Channel[] = [];
    for (const [accountId, group] of groupByChannel(rows)) {
      const entry = run.deps.providers.get(group[0]?.provider ?? '');
      if (entry === undefined || !entry.manifest.capabilities.analytics) continue;
      const ref = { workspaceId, accountId, entry };
      const source = await sourceOf(trx, run.deps, ref);
      if (source === 'unreadable') run.counts.failed++;
      if (source === null || source === 'unreadable') continue;
      channels.push({ ...ref, rows: group, source });
    }
    return channels;
  });
}

async function pullWorkspace(run: Run, workspaceId: string): Promise<void> {
  await pullPosts(run, workspaceId);
  await pullFollowers(run, workspaceId);
}

async function pullPosts(run: Run, workspaceId: string): Promise<void> {
  for (const channel of await loadChannels(run, workspaceId)) {
    run.counts.channels++;
    try {
      await pullChannel(run, channel);
    } catch {
      run.counts.failed++;
      run.deps.logger.error(
        { task: TASK, channel: encodePublicId('socialAccount', channel.accountId) },
        'analytics pull failed for a channel',
      );
    }
  }
}

export async function pullAnalytics(deps: PullDeps): Promise<string> {
  const counts: Run['counts'] = {
    channels: 0,
    pulled: 0,
    snapshots: 0,
    done: 0,
    retried: 0,
    stopped: 0,
    followerChecks: 0,
    followers: 0,
    failed: 0,
  };
  const run: Run = { deps, observedAt: new Date(deps.now().epochMilliseconds), counts };
  return await sweepCron(deps, TASK, counts, (workspaceId) => pullWorkspace(run, workspaceId));
}
