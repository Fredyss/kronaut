import {
  type AccountMetrics,
  type AccountProfile,
  analyticsScheduleOf,
  encodePublicId,
  isCreditsDepleted,
  isProviderFailure,
  type ProviderError,
} from '@kronaut/core';
import type { Actor, DB, TenantDb } from '@kronaut/db';
import { type ExpressionBuilder, sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import type { ChannelRef } from '../../access/channels/channel-ref.ts';
import { createBaseContext, type ProviderEntry } from '../../base/providers/providers.ts';
import {
  type DeadGrant,
  errorFields,
  metricValue,
  type PullDeps,
  type Run,
  type Source,
  sourceOf,
  utcDayOf,
} from './source.ts';
import { MAX_ATTEMPTS, resumeAt, storedValue } from './store.ts';

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

async function storeProfile(trx: TenantDb, channel: ChannelRef, profile: AccountProfile) {
  const next = {
    display_name: profile.displayName.normalize('NFC'),
    handle: profile.handle?.normalize('NFC') ?? null,
    profile_url: profile.profileUrl ?? null,
  };
  await trx
    .updateTable('social_accounts')
    .set(next)
    .where('workspace_id', '=', channel.workspaceId)
    .where('id', '=', channel.accountId)
    .where('status', '=', 'active')
    .where((eb) =>
      eb.or([
        eb('display_name', '<>', next.display_name),
        eb('handle', 'is distinct from', next.handle),
        eb('profile_url', 'is distinct from', next.profile_url),
      ]),
    )
    .execute();
}

async function markChecked(trx: TenantDb, { workspaceId, accountId }: ChannelRef, day: string) {
  await trx
    .insertInto('account_metric_pulls')
    .values({ workspace_id: workspaceId, social_account_id: accountId, checked_on: day })
    .onConflict((oc) =>
      oc
        .columns(['workspace_id', 'social_account_id'])
        .doUpdateSet({ checked_on: day, attempts: 0, retry_after: null }),
    )
    .execute();
}

export async function deferFollowerRead(
  trx: TenantDb,
  { workspaceId, accountId }: ChannelRef,
  until: Date,
) {
  await trx
    .insertInto('account_metric_pulls')
    .values({ workspace_id: workspaceId, social_account_id: accountId, retry_after: until })
    .onConflict((oc) =>
      oc.columns(['workspace_id', 'social_account_id']).doUpdateSet({ retry_after: until }),
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

// Only failures that prove the grant or the channel gone; an expired access token is the refresh path's call, and an unknown 4xx or schema drift can hit every channel at once.
function deadGrant(failure: ProviderError): DeadGrant['incident'] | null {
  if (failure.kind === 'auth_revoked') return 'auth_revoked';
  return failure.kind === 'permanent' && failure.code === 'channel_missing' ? 'auth_revoked' : null;
}

async function flagDeadGrant(
  trx: TenantDb,
  deps: PullDeps,
  channel: FollowerChannel,
  failure: ProviderError,
) {
  const incident = deadGrant(failure);
  if (incident === null || channel.entry.manifest.dataRetention === undefined) return;
  await deps.flagAccount(trx, {
    workspaceId: channel.workspaceId,
    socialAccountId: channel.accountId,
    fence: channel.source.fence,
    incident,
  });
}

function providersByCadence(run: Run): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const entry of run.deps.providers.list()) {
    if (entry.runtime.accountMetrics === undefined) continue;
    const days = analyticsScheduleOf(entry.manifest).followersEveryDays;
    groups.set(days, [...(groups.get(days) ?? []), entry.manifest.id]);
  }
  return groups;
}

type DueBuilder = ExpressionBuilder<
  DB & { a: DB['social_accounts']; m: DB['account_metric_pulls'] },
  'a' | 'm'
>;

function dueByCadence(eb: DueBuilder, groups: Map<number, string[]>, observedAt: Date) {
  const today = Temporal.Instant.fromEpochMilliseconds(observedAt.getTime());
  return eb.or(
    [...groups].map(([days, providers]) => {
      const since = utcDayOf(today.subtract({ hours: 24 * (days - 1) })).day;
      return eb.and([
        eb('a.provider', 'in', providers),
        eb.or([eb('m.checked_on', 'is', null), eb('m.checked_on', '<', since)]),
      ]);
    }),
  );
}

async function dueChannels(run: Run, workspaceId: string): Promise<FollowerChannel[]> {
  const groups = providersByCadence(run);
  if (groups.size === 0) return [];
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
      .where((eb) => dueByCadence(eb, groups, run.observedAt))
      .where((eb) =>
        eb.or([eb('m.retry_after', 'is', null), eb('m.retry_after', '<=', run.observedAt)]),
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
  let failure: ProviderError | null = null;
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
    failure = err.error;
  }
  const now = deps.now();
  const readAt = utcDayOf(now);
  await deps.db.withTenant(channel.workspaceId, SYSTEM, async (trx) => {
    if (failure?.kind === 'rate_limited' || isCreditsDepleted(failure)) {
      return await deferFollowerRead(trx, channel, resumeAt(now, failure));
    }
    if (failure?.kind === 'transient') return await countAttempt(trx, channel, readAt.day);
    if (failure !== null) await flagDeadGrant(trx, deps, channel, failure);
    if (metrics !== null && (await storeFollowers(trx, channel, metrics, readAt))) {
      run.counts.followers++;
    }
    if (metrics?.profile !== undefined) await storeProfile(trx, channel, metrics.profile);
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
