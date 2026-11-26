import type {
  AccountMetrics,
  AccountProfile,
  AnalyticsResult,
  PostMetrics,
  ProviderAnalytics,
  ProviderError,
  ProviderRuntime,
} from '@kronaut/core';
import { ProviderFailure } from '@kronaut/core';
import type { HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { expect } from 'vitest';
import { createProviderRegistry } from '../../base/providers/providers.ts';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  BASE,
  create,
  db,
  draft,
  fake,
  insertAccount,
  internal,
  keyring,
  media,
  owner,
  ownerAuth,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { flagAccount } from '../../steps/publish/incidents.ts';
import { publishDeps, runPublish } from '../../steps/publish/task.ts';
import { pullAnalytics } from './pull.ts';

const logger = pino({ level: 'silent' });

type Reply = PostMetrics | ProviderError;
export const replies = new Map<string, Reply>();
export const scenario: {
  thrown: ProviderError | null;
  followers: number | null;
  followerError: ProviderError | null;
  windowHours: number | undefined;
  analytics: ProviderAnalytics | undefined;
} = {
  thrown: null,
  followers: 10,
  followerError: null,
  windowHours: undefined,
  analytics: undefined,
};
export const followerFailures = new Map<string, ProviderError>();
export const followerCalls = new Map<string, number>();
export const profiles = new Map<string, AccountProfile>();
export const lapseDuringRead = new Set<string>();
export const revoked = new Set<string>();
export const analyticsCalls = new Map<string, number>();
export const postTypesSeen = new Map<string, string>();
const PUBLISHED_AT = Temporal.Instant.from('2027-01-04T06:00:00Z');

function analytics(account: string, remoteIds: readonly string[]): AnalyticsResult {
  analyticsCalls.set(account, (analyticsCalls.get(account) ?? 0) + 1);
  if (revoked.has(account)) throw new ProviderFailure({ kind: 'auth_revoked' });
  if (scenario.thrown !== null) throw new ProviderFailure(scenario.thrown);
  const posts: Record<string, PostMetrics> = {};
  const failed: Record<string, ProviderError> = {};
  for (const id of remoteIds) {
    const reply = replies.get(id);
    if (reply === undefined) continue;
    if ('kind' in reply) failed[id] = reply as ProviderError;
    else posts[id] = reply;
  }
  return { posts, failed, apiVersion: 'v-test' };
}

async function lapse(providerAccountId: string): Promise<void> {
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ status: 'needs_reauth' })
      .where('provider_account_id', '=', providerAccountId)
      .execute(),
  );
}

function registry(retainData = false) {
  const runtime: ProviderRuntime = {
    ...fake.runtime,
    analytics: async (_ctx, input) => {
      for (const [id, type] of Object.entries(input.postTypes)) postTypesSeen.set(id, type);
      return analytics(input.account.providerAccountId, input.remoteIds);
    },
    accountMetrics: async (_ctx, input): Promise<AccountMetrics> => {
      const id = input.account.providerAccountId;
      followerCalls.set(id, (followerCalls.get(id) ?? 0) + 1);
      const failure = followerFailures.get(id) ?? scenario.followerError;
      if (failure !== null) throw new ProviderFailure(failure);
      if (lapseDuringRead.has(id)) await lapse(id);
      const profile = profiles.get(id);
      return {
        followers: scenario.followers,
        apiVersion: 'v-test',
        ...(profile === undefined ? {} : { profile }),
      };
    },
  };
  const manifest = {
    ...fake.manifest,
    postTypes: fake.manifest.postTypes.map((type) =>
      scenario.windowHours === undefined
        ? type
        : { ...type, analytics: { windowHours: scenario.windowHours } },
    ),
    capabilities: { analytics: true, delete: false },
    ...(scenario.analytics === undefined ? {} : { analytics: scenario.analytics }),
    ...(retainData ? { dataRetention: { disconnectedDays: 7, lapsedDays: 30 } } : {}),
  };
  return createProviderRegistry([manifest], [runtime], () => ({}) as HttpClient);
}

export function startAnalytics(database: Parameters<typeof startPosts>[0]): Promise<void> {
  return startPosts(database, logger, () => Temporal.Now.instant());
}

export { stopPosts };

export interface Published {
  readonly post: PostDto;
  readonly destinationId: string;
  readonly channel: string;
  readonly remoteId: string;
  readonly publishedAt: Temporal.Instant;
}

let published = 0;
const HOUR_MS = 3_600_000;

export function lastPublished(): number {
  return published - 1;
}

function firstPullMs(): number {
  return (scenario.analytics?.pullHours?.[0] ?? 1) * HOUR_MS;
}

export async function publishOne(label: string, existing?: string): Promise<Published> {
  const channel = existing ?? (await insertAccount(`${label} ${published}`));
  published++;
  const post = await scheduled(await create(ownerAuth, draft(channel)));
  const destination = await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('post_destinations')
      .set({ run_at: sql<Date>`now() - interval '1 second'` })
      .where('post_id', '=', internal(post.id))
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  const remoteId = `remote-${label}-${published}`;
  fake.script({ kind: 'publish', remoteId });
  const deps = publishDeps({
    db,
    providers: registry(),
    keyring,
    media,
    logger,
    workerId: 'analytics-test',
    publicBaseUrl: BASE,
  });
  await runPublish(deps, { workspaceId, id: destination.id });
  const row = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations as d')
      .leftJoin('destination_metric_pulls as p', 'p.destination_id', 'd.id')
      .select(['d.state', 'd.published_at', 'p.step', 'p.attempts', 'p.next_pull_at'])
      .where('d.id', '=', destination.id)
      .executeTakeFirstOrThrow(),
  );
  const result = { post, destinationId: destination.id, channel, remoteId };
  expect(row.state).toBe('published');
  if (row.step === null) return { ...result, publishedAt: PUBLISHED_AT };
  expect(row).toMatchObject({ step: 0, attempts: 0 });
  expect(row.next_pull_at?.getTime()).toBe((row.published_at?.getTime() ?? 0) + firstPullMs());
  await pin(destination.id);
  return { ...result, publishedAt: PUBLISHED_AT };
}

async function pin(destinationId: string): Promise<void> {
  const at = new Date(PUBLISHED_AT.epochMilliseconds);
  await owner.withActor(SYSTEM, async (trx) => {
    await trx
      .updateTable('post_destinations')
      .set({ published_at: at })
      .where('id', '=', destinationId)
      .execute();
    await trx
      .updateTable('destination_metric_pulls')
      .set({ next_pull_at: new Date(at.getTime() + firstPullMs()) })
      .where('destination_id', '=', destinationId)
      .execute();
  });
}

export function pullAt(at: Temporal.Instant, retainData = false) {
  return pullAnalytics({
    db,
    keyring,
    providers: registry(retainData),
    logger,
    publicBaseUrl: BASE,
    now: () => at,
    flagAccount,
  });
}

export function pullOf(target: Published) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_metric_pulls')
      .select(['step', 'next_pull_at', 'attempts'])
      .where('destination_id', '=', target.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

export function snapshotsOf(target: Published) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_metric_snapshots')
      .select(['metric', 'value', 'provider', 'api_version'])
      .where('destination_id', '=', target.destinationId)
      .orderBy('observed_at')
      .orderBy('metric')
      .execute(),
  );
}

export function hoursAfter(target: Published, hours: number) {
  return target.publishedAt.add({ hours, minutes: 1 });
}
