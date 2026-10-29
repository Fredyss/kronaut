import { type AccountMetrics, encodePublicId, isProviderFailure } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { createBaseContext, type ProviderEntry } from '../providers.ts';
import {
  type ChannelRef,
  errorFields,
  metricValue,
  type Run,
  type Source,
  sourceOf,
  utcDay,
  utcDayOf,
} from './source.ts';
import { MAX_ATTEMPTS, storedValue } from './store.ts';

const MAX_CHANNELS = 50;
const SYSTEM: Actor = { kind: 'system' };

interface FollowerChannel extends ChannelRef {
  readonly entry: ProviderEntry;
  readonly source: Source;
}

interface ReadTime {
  readonly at: Date;
  readonly day: string;
}

async function storeFollowers(
  trx: TenantDb,
  channel: FollowerChannel,
  metrics: AccountMetrics,
  read: ReadTime,
): Promise<boolean> {
  const { workspaceId, accountId } = channel;
  const value = metricValue(metrics.followers);
  const latest = await trx
    .selectFrom('account_daily_metrics')
    .select('value')
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId)
    .where('metric', '=', 'followers')
    .orderBy('day', 'desc')
    .limit(1)
    .executeTakeFirst();
  if (latest !== undefined && storedValue(latest.value) === value) return false;
  await trx
    .insertInto('account_daily_metrics')
    .values({
      workspace_id: workspaceId,
      social_account_id: accountId,
      day: read.day,
      metric: 'followers',
      value,
      observed_at: read.at,
      provider: channel.entry.manifest.id,
      api_version: metrics.apiVersion,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
  return true;
}

async function markChecked(trx: TenantDb, { workspaceId, accountId }: ChannelRef, day: string) {
  await trx
    .insertInto('account_metric_pulls')
    .values({ workspace_id: workspaceId, social_account_id: accountId, checked_on: day })
    .onConflict((oc) =>
      oc
        .columns(['workspace_id', 'social_account_id'])
        .doUpdateSet({ checked_on: day, attempts: 0 }),
    )
    .execute();
}

async function countAttempt(trx: TenantDb, channel: ChannelRef, day: string) {
  const { workspaceId, accountId } = channel;
  const row = await trx
    .insertInto('account_metric_pulls')
    .values({ workspace_id: workspaceId, social_account_id: accountId, attempts: 1 })
    .onConflict((oc) =>
      oc
        .columns(['workspace_id', 'social_account_id'])
        .doUpdateSet({ attempts: sql`account_metric_pulls.attempts + 1` }),
    )
    .returning('attempts')
    .executeTakeFirstOrThrow();
  if (row.attempts >= MAX_ATTEMPTS) await markChecked(trx, channel, day);
}

async function dueChannels(run: Run, workspaceId: string): Promise<FollowerChannel[]> {
  const providers = run.deps.providers
    .list()
    .filter((entry) => entry.runtime.accountMetrics !== undefined)
    .map((entry) => entry.manifest.id);
  if (providers.length === 0) return [];
  return await run.deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const rows = await trx
      .selectFrom('social_accounts as a')
      .leftJoin('account_metric_pulls as m', (join) =>
        join
          .onRef('m.workspace_id', '=', 'a.workspace_id')
          .onRef('m.social_account_id', '=', 'a.id'),
      )
      .select(['a.id', 'a.provider'])
      .where('a.workspace_id', '=', workspaceId)
      .where('a.status', '=', 'active')
      .where('a.provider', 'in', providers)
      .where((eb) =>
        eb.or([eb('m.checked_on', 'is', null), eb('m.checked_on', '<', utcDay(run.observedAt))]),
      )
      .orderBy('m.checked_on', (ob) => ob.asc().nullsFirst())
      .orderBy('a.id')
      .limit(MAX_CHANNELS)
      .execute();
    const channels: FollowerChannel[] = [];
    for (const row of rows) {
      const entry = run.deps.providers.get(row.provider);
      if (entry === undefined) continue;
      const ref = { workspaceId, accountId: row.id, entry };
      const source = await sourceOf(trx, run.deps, ref);
      if (source !== null && source !== 'unreadable') {
        channels.push({ ...ref, source });
        continue;
      }
      if (source === 'unreadable') run.counts.unreadable++;
      await markChecked(trx, ref, utcDayOf(run.deps.now()).day);
    }
    return channels;
  });
}

async function readFollowers(run: Run, channel: FollowerChannel): Promise<void> {
  const read = channel.entry.runtime.accountMetrics;
  if (read === undefined) return;
  const { deps } = run;
  const ctx = createBaseContext(channel.entry, deps.logger, new AbortController().signal, deps.now);
  run.counts.followerChecks++;
  let metrics: AccountMetrics | null = null;
  let transient = false;
  try {
    metrics = await read(ctx, channel.source);
  } catch (err) {
    if (!isProviderFailure(err)) throw err;
    deps.logger.warn(
      {
        task: 'analytics_pull',
        channel: encodePublicId('socialAccount', channel.accountId),
        reason: err.error.kind,
      },
      'the follower count could not be read',
    );
    if (err.error.kind === 'rate_limited') return;
    transient = err.error.kind === 'transient';
  }
  const readAt = utcDayOf(deps.now());
  await deps.db.withTenant(channel.workspaceId, SYSTEM, async (trx) => {
    if (transient) return await countAttempt(trx, channel, readAt.day);
    if (metrics !== null && (await storeFollowers(trx, channel, metrics, readAt))) {
      run.counts.followers++;
    }
    await markChecked(trx, channel, readAt.day);
  });
}

export async function pullFollowers(run: Run, workspaceId: string): Promise<void> {
  for (const channel of await dueChannels(run, workspaceId)) {
    try {
      await readFollowers(run, channel);
    } catch (err) {
      run.counts.failed++;
      run.deps.logger.error(
        {
          task: 'analytics_pull',
          channel: encodePublicId('socialAccount', channel.accountId),
          ...errorFields(err),
        },
        'the follower count could not be stored',
      );
    }
  }
}
