import {
  type AnalyticsResult,
  encodePublicId,
  POST_METRICS,
  type PostMetrics,
  type ProviderError,
  type ProviderRuntime,
} from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { toProviderFailure } from '@kronaut/providers/failure';
import { createBaseContext, type ProviderEntry } from '../providers.ts';
import { sweepCron } from '../workspace-sweep.ts';
import { pullFollowers } from './followers.ts';
import {
  errorFields,
  metricValue,
  type PullDeps,
  type Run,
  type Source,
  sourceOf,
} from './source.ts';
import {
  type DueRow,
  deferPulls,
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
const LIMITS = { total: 100, perChannel: 25 };
const SYSTEM: Actor = { kind: 'system' };
const STOP_KINDS: ReadonlySet<ProviderError['kind']> = new Set([
  'rate_limited',
  'auth_expired',
  'auth_revoked',
  'app_config',
]);

type ReadAnalytics = NonNullable<ProviderRuntime['analytics']>;

interface Channel {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly entry: ProviderEntry;
  readonly read: ReadAnalytics;
  readonly rows: readonly DueRow[];
  readonly source: Source;
}

type RowResult =
  | { readonly kind: 'metrics'; readonly metrics: PostMetrics }
  | { readonly kind: 'error'; readonly error: ProviderError }
  | { readonly kind: 'unread' };

interface Fetched {
  readonly results: ReadonlyMap<DueRow, RowResult>;
  readonly apiVersion: string;
  readonly observedAt: Date;
}

function outcomeOf(result: RowResult): PullOutcome | null {
  if (result.kind === 'unread') return null;
  if (result.kind === 'metrics') return 'advance';
  return result.error.kind === 'permanent' ? 'done' : 'transient';
}

// A provider may read only part of the batch to stay in its budget; the rest stays due.
function rowResult(result: AnalyticsResult, remoteId: string): RowResult {
  if (Object.hasOwn(result.posts, remoteId)) {
    return { kind: 'metrics', metrics: result.posts[remoteId] ?? {} };
  }
  const failed = result.failed ?? {};
  const error = Object.hasOwn(failed, remoteId) ? failed[remoteId] : undefined;
  return error === undefined ? { kind: 'unread' } : { kind: 'error', error };
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
  results: Fetched['results'],
): Promise<Snapshot[]> {
  const ids = channel.rows.map((row) => row.destinationId);
  const latest = await latestSnapshots(trx, channel.workspaceId, ids);
  return [...results].flatMap(([row, result]) =>
    result.kind === 'metrics' ? changed(row, result.metrics, latest) : [],
  );
}

async function settle(trx: TenantDb, run: Run, channel: Channel, fetched: Fetched) {
  const scope = { workspaceId: channel.workspaceId, now: run.deps.now() };
  for (const [row, result] of fetched.results) {
    if (result.kind === 'error' && STOP_KINDS.has(result.error.kind)) {
      await deferPulls(trx, scope, [row], result.error);
      continue;
    }
    const outcome = outcomeOf(result);
    if (outcome === null) continue;
    run.counts.pulled++;
    const settled = await settlePull(trx, scope, row, outcome);
    if (settled === 'done') run.counts.done++;
    if (settled === 'transient') run.counts.retried++;
  }
}

async function write(run: Run, channel: Channel, fetched: Fetched): Promise<void> {
  await run.deps.db.withTenant(channel.workspaceId, SYSTEM, async (trx) => {
    const snapshots = await changedSnapshots(trx, channel, fetched.results);
    run.counts.snapshots += await insertSnapshots(trx, channel.workspaceId, snapshots, {
      provider: channel.entry.manifest.id,
      apiVersion: fetched.apiVersion,
      observedAt: fetched.observedAt,
    });
    await settle(trx, run, channel, fetched);
  });
}

async function stop(run: Run, channel: Channel, error: ProviderError): Promise<void> {
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
  const scope = { workspaceId: channel.workspaceId, now: run.deps.now() };
  await run.deps.db.withTenant(channel.workspaceId, SYSTEM, (trx) =>
    deferPulls(trx, scope, channel.rows, error),
  );
}

async function fetchResults(run: Run, channel: Channel): Promise<Fetched | ProviderError> {
  const { deps } = run;
  const ctx = createBaseContext(channel.entry, deps.logger, new AbortController().signal, deps.now);
  const remoteIds = [...new Set(channel.rows.map((row) => row.remoteId))];
  try {
    const result = await channel.read(ctx, { ...channel.source, remoteIds });
    const results = new Map(channel.rows.map((row) => [row, rowResult(result, row.remoteId)]));
    const observedAt = new Date(deps.now().epochMilliseconds);
    return { results, apiVersion: result.apiVersion, observedAt };
  } catch (err) {
    const error = toProviderFailure(err, 'none').error;
    if (STOP_KINDS.has(error.kind)) return error;
    const results = new Map(
      channel.rows.map((row): [DueRow, RowResult] => [row, { kind: 'error', error }]),
    );
    return { results, apiVersion: '', observedAt: new Date(deps.now().epochMilliseconds) };
  }
}

async function pullChannel(run: Run, channel: Channel): Promise<void> {
  const fetched = await fetchResults(run, channel);
  if ('kind' in fetched) await stop(run, channel, fetched);
  else await write(run, channel, fetched);
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

async function channelOf(
  trx: TenantDb,
  run: Run,
  ref: { readonly workspaceId: string; readonly accountId: string },
  rows: readonly DueRow[],
): Promise<Channel | 'unreadable' | null> {
  const entry = run.deps.providers.get(rows[0]?.provider ?? '');
  const read = entry?.manifest.capabilities.analytics ? entry.runtime.analytics : undefined;
  if (entry === undefined || read === undefined) return null;
  const source = await sourceOf(trx, run.deps, { ...ref, entry });
  return source === null || source === 'unreadable'
    ? source
    : { ...ref, entry, read, rows, source };
}

async function loadChannels(run: Run, workspaceId: string): Promise<Channel[]> {
  return await run.deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const rows = await dueRows(trx, workspaceId, run.observedAt, LIMITS);
    const scope = { workspaceId, now: run.deps.now() };
    const channels: Channel[] = [];
    for (const [accountId, group] of groupByChannel(rows)) {
      const channel = await channelOf(trx, run, { workspaceId, accountId }, group);
      if (typeof channel === 'object' && channel !== null) {
        channels.push(channel);
        continue;
      }
      if (channel === 'unreadable') run.counts.unreadable++;
      else run.counts.skipped++;
      await deferPulls(trx, scope, group, null);
    }
    return channels;
  });
}

async function pullPosts(run: Run, workspaceId: string): Promise<void> {
  for (const channel of await loadChannels(run, workspaceId)) {
    run.counts.channels++;
    try {
      await pullChannel(run, channel);
    } catch (err) {
      run.counts.failed++;
      run.deps.logger.error(
        {
          task: TASK,
          channel: encodePublicId('socialAccount', channel.accountId),
          ...errorFields(err),
        },
        'analytics pull failed for a channel',
      );
    }
  }
}

async function pullWorkspace(run: Run, workspaceId: string): Promise<void> {
  await pullPosts(run, workspaceId);
  await pullFollowers(run, workspaceId);
}

export async function pullAnalytics(deps: PullDeps): Promise<string> {
  const counts: Run['counts'] = {
    channels: 0,
    pulled: 0,
    snapshots: 0,
    done: 0,
    retried: 0,
    stopped: 0,
    skipped: 0,
    unreadable: 0,
    followerChecks: 0,
    followers: 0,
    failed: 0,
  };
  const run: Run = { deps, observedAt: new Date(deps.now().epochMilliseconds), counts };
  return await sweepCron(deps, TASK, counts, (workspaceId) => pullWorkspace(run, workspaceId));
}
