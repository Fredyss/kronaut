import type {
  AccountMetrics,
  AnalyticsResult,
  PostMetrics,
  ProviderError,
  ProviderRuntime,
} from '@kronaut/core';
import { decodePublicId, encodePublicId, ProviderFailure } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostDto } from '../posts/dto.ts';
import {
  BASE,
  call,
  create,
  db,
  draft,
  fake,
  grantAuth,
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
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';
import { createProviderRegistry } from '../providers.ts';
import { publishDeps, runPublish } from '../publish/task.ts';
import { pullAnalytics } from './pull.ts';

const logger = pino({ level: 'silent' });
let test: TestDatabase;

type Reply = PostMetrics | ProviderError;
const replies = new Map<string, Reply>();
let thrown: ProviderError | null = null;
let followers: number | null = 10;
let followerError: ProviderError | null = null;
const followerCalls = new Map<string, number>();
const revoked = new Set<string>();
const analyticsCalls = new Map<string, number>();
const PUBLISHED_AT = Temporal.Instant.from('2027-01-04T06:00:00Z');

function analytics(account: string, remoteIds: readonly string[]): AnalyticsResult {
  analyticsCalls.set(account, (analyticsCalls.get(account) ?? 0) + 1);
  if (revoked.has(account)) throw new ProviderFailure({ kind: 'auth_revoked' });
  if (thrown !== null) throw new ProviderFailure(thrown);
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

function registry() {
  const runtime: ProviderRuntime = {
    ...fake.runtime,
    analytics: async (_ctx, input) => analytics(input.account.providerAccountId, input.remoteIds),
    accountMetrics: async (_ctx, input): Promise<AccountMetrics> => {
      const id = input.account.providerAccountId;
      followerCalls.set(id, (followerCalls.get(id) ?? 0) + 1);
      if (followerError !== null) throw new ProviderFailure(followerError);
      return { followers, apiVersion: 'v-test' };
    },
  };
  const manifest = { ...fake.manifest, capabilities: { analytics: true, delete: false } };
  return createProviderRegistry([manifest], [runtime], () => ({}) as HttpClient);
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, logger, () => Temporal.Now.instant());
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

interface Published {
  readonly post: PostDto;
  readonly destinationId: string;
  readonly channel: string;
  readonly remoteId: string;
  readonly publishedAt: Temporal.Instant;
}

let published = 0;
const HOUR_MS = 3_600_000;

async function publishOne(label: string, existing?: string): Promise<Published> {
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
      .innerJoin('destination_metric_pulls as p', 'p.destination_id', 'd.id')
      .select(['d.state', 'd.published_at', 'p.step', 'p.attempts', 'p.next_pull_at'])
      .where('d.id', '=', destination.id)
      .executeTakeFirstOrThrow(),
  );
  expect(row).toMatchObject({ state: 'published', step: 0, attempts: 0 });
  expect(row.next_pull_at?.getTime()).toBe((row.published_at?.getTime() ?? 0) + HOUR_MS);
  await pin(destination.id);
  return { post, destinationId: destination.id, channel, remoteId, publishedAt: PUBLISHED_AT };
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
      .set({ next_pull_at: new Date(at.getTime() + HOUR_MS) })
      .where('destination_id', '=', destinationId)
      .execute();
  });
}

function pullAt(at: Temporal.Instant) {
  return pullAnalytics({
    db,
    keyring,
    providers: registry(),
    logger,
    publicBaseUrl: BASE,
    now: () => at,
  });
}

function pullOf(target: Published) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_metric_pulls')
      .select(['step', 'next_pull_at', 'attempts'])
      .where('destination_id', '=', target.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

function snapshotsOf(target: Published) {
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

function hoursAfter(target: Published, hours: number) {
  return target.publishedAt.add({ hours, minutes: 1 });
}

describe('analytics pulls', () => {
  it('a published destination gets its first pull 1 h after publishing', async () => {
    const target = await publishOne('seed');
    expect(await pullOf(target)).toEqual({
      step: 0,
      attempts: 0,
      next_pull_at: new Date(target.publishedAt.add({ hours: 1 }).epochMilliseconds),
    });
  });

  it('writes a snapshot only when a value changes and advances the step', async () => {
    const target = await publishOne('pull');
    replies.set(target.remoteId, { likes: 3, reposts: 1 });
    await pullAt(hoursAfter(target, 1));
    expect(await snapshotsOf(target)).toEqual([
      { metric: 'likes', value: '3', provider: 'fake', api_version: 'v-test' },
      { metric: 'reposts', value: '1', provider: 'fake', api_version: 'v-test' },
    ]);
    expect(await pullOf(target)).toMatchObject({ step: 1 });
    await pullAt(hoursAfter(target, 6));
    expect(await snapshotsOf(target)).toHaveLength(2);
    expect(await pullOf(target)).toMatchObject({ step: 2 });
    replies.set(target.remoteId, { likes: 4, reposts: 1 });
    await pullAt(hoursAfter(target, 24));
    expect((await snapshotsOf(target)).slice(2)).toEqual([
      { metric: 'likes', value: '4', provider: 'fake', api_version: 'v-test' },
    ]);
    expect(await pullOf(target)).toEqual({
      step: 3,
      attempts: 0,
      next_pull_at: new Date(target.publishedAt.add({ hours: 72 }).epochMilliseconds),
    });
  });

  it('stores a value that disappears as NULL once, never as 0', async () => {
    const target = await publishOne('null');
    replies.set(target.remoteId, { likes: 2 });
    await pullAt(hoursAfter(target, 1));
    replies.set(target.remoteId, { likes: null });
    await pullAt(hoursAfter(target, 6));
    await pullAt(hoursAfter(target, 24));
    expect((await snapshotsOf(target)).map((row) => row.value)).toEqual(['2', null]);
  });

  it('ends the pulls on a permanent error and keeps them due on a rate limit', async () => {
    const gone = await publishOne('gone');
    replies.set(gone.remoteId, { kind: 'permanent', code: 'not_found' });
    await pullAt(hoursAfter(gone, 1));
    expect(await pullOf(gone)).toMatchObject({ step: 0, next_pull_at: null });

    const limited = await publishOne('limited');
    const resetAt = hoursAfter(limited, 1).add({ minutes: 40 });
    thrown = { kind: 'rate_limited', scope: 'account', resetAt };
    try {
      await pullAt(hoursAfter(limited, 1));
    } finally {
      thrown = null;
    }
    expect(await pullOf(limited)).toEqual({
      step: 0,
      attempts: 0,
      next_pull_at: new Date(resetAt.epochMilliseconds),
    });
  });

  it('skips steps whose time has already passed', async () => {
    const late = await publishOne('late');
    replies.set(late.remoteId, { likes: 1 });
    await pullAt(hoursAfter(late, 80));
    expect(await pullOf(late)).toEqual({
      step: 4,
      attempts: 0,
      next_pull_at: new Date(late.publishedAt.add({ hours: 168 }).epochMilliseconds),
    });
  });

  it('retries a transient error and skips the step after 3 attempts', async () => {
    const target = await publishOne('flaky');
    replies.set(target.remoteId, { kind: 'transient' });
    await pullAt(hoursAfter(target, 1));
    await pullAt(hoursAfter(target, 1).add({ minutes: 15 }));
    expect(await pullOf(target)).toMatchObject({ step: 0, attempts: 2 });
    await pullAt(hoursAfter(target, 1).add({ minutes: 30 }));
    expect(await pullOf(target)).toMatchObject({ step: 1, attempts: 0 });
  });

  it("reads every channel's follower count once a day and stores only changes", async () => {
    const channel = await insertAccount('followers');
    const accountId = decodePublicId('socialAccount', channel) ?? '';
    const day = Temporal.Instant.from('2027-02-01T10:00:00Z');
    const calls = () => followerCalls.get('fake-followers') ?? 0;
    const rows = () =>
      owner.withActor(SYSTEM, (trx) =>
        trx
          .selectFrom('account_daily_metrics')
          .select(['day', 'metric', 'value'])
          .where('social_account_id', '=', accountId)
          .execute(),
      );
    followers = 10;
    await pullAt(day);
    await pullAt(day.add({ minutes: 15 }));
    expect(calls()).toBe(1);
    await pullAt(day.add({ hours: 24 }));
    expect(calls()).toBe(2);
    expect(await rows()).toEqual([{ day: '2027-02-01', metric: 'followers', value: '10' }]);
    followerError = { kind: 'transient' };
    for (let run = 0; run < 4; run++) await pullAt(day.add({ hours: 48, minutes: 15 * run }));
    expect(calls()).toBe(5);
    followerError = { kind: 'rate_limited', scope: 'app', resetAt: day.add({ hours: 73 }) };
    await pullAt(day.add({ hours: 72 }));
    await pullAt(day.add({ hours: 72, minutes: 15 }));
    expect(calls()).toBe(6);
    followerError = null;
    await pullAt(day.add({ hours: 73 }));
    expect(calls()).toBe(7);
    await pullAt(day.add({ hours: 73, minutes: 15 }));
    expect(calls()).toBe(7);
  });

  it('a stopped channel is pushed back and does not starve a healthy one', async () => {
    const stuck = await insertAccount('revoked');
    const rows = [];
    for (let i = 0; i < 30; i++) rows.push(await publishOne('revoked', stuck));
    const healthy = await publishOne('healthy');
    replies.set(healthy.remoteId, { likes: 1 });
    revoked.add('fake-revoked');
    const at = hoursAfter(healthy, 1);
    await pullAt(at);
    expect(await pullOf(healthy)).toMatchObject({ step: 1 });
    expect(analyticsCalls.get('fake-revoked')).toBe(1);
    const pulls = await Promise.all(rows.map(pullOf));
    const resumed = new Date(at.add({ hours: 1 }).epochMilliseconds).getTime();
    expect(pulls.filter((pull) => pull.next_pull_at?.getTime() === resumed)).toHaveLength(25);
    expect(pulls.every((pull) => pull.step === 0 && pull.attempts === 0)).toBe(true);
  });
});

describe('analytics routes', () => {
  it('returns the latest values and snapshots per published destination', async () => {
    const target = await publishOne('route');
    replies.set(target.remoteId, { likes: 5, quotes: null });
    await pullAt(hoursAfter(target, 1));
    replies.set(target.remoteId, { likes: 6, quotes: null });
    await pullAt(hoursAfter(target, 6));
    const response = await call('GET', `posts/${target.post.id}/metrics`, viewerAuth);
    expect(response.status).toBe(200);
    const first = hoursAfter(target, 1).toString({ smallestUnit: 'millisecond' });
    const second = hoursAfter(target, 6).toString({ smallestUnit: 'millisecond' });
    expect(await response.json()).toEqual({
      destinations: [
        {
          destinationId: encodePublicId('destination', target.destinationId),
          channelId: target.channel,
          latest: {
            likes: { value: 6, observedAt: second },
            quotes: { value: null, observedAt: first },
          },
          snapshots: [
            { metric: 'likes', value: 5, observedAt: first },
            { metric: 'quotes', value: null, observedAt: first },
            { metric: 'likes', value: 6, observedAt: second },
          ],
        },
      ],
    });
    const range = 'from=2027-01-01&to=2027-01-31';
    const channel = await call('GET', `channels/${target.channel}/metrics?${range}`, ownerAuth);
    const day = hoursAfter(target, 1).toString().slice(0, 10);
    expect(await channel.json()).toEqual({ followers: [{ day, value: 10 }], before: null });
    const later = await call(
      'GET',
      `channels/${target.channel}/metrics?from=2027-01-10&to=2027-01-31`,
      ownerAuth,
    );
    expect(await later.json()).toEqual({ followers: [], before: { day, value: 10 } });
  });

  it('needs analytics:read', async () => {
    const target = await publishOne('denied');
    expect((await call('GET', `posts/${target.post.id}/metrics`, grantAuth)).status).toBe(403);
    expect((await call('GET', `channels/${target.channel}/metrics`, grantAuth)).status).toBe(403);
    const bad = await call(
      'GET',
      `channels/${target.channel}/metrics?from=2026-01-01&to=2027-06-01`,
      ownerAuth,
    );
    expect(bad.status).toBe(422);
  });
});
