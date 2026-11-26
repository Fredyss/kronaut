import { decodePublicId, encodePublicId, type ProviderError } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  call,
  grantAuth,
  insertAccount,
  owner,
  ownerAuth,
  SYSTEM,
  viewerAuth,
} from '../../flow/posts/testing.ts';
import {
  analyticsCalls,
  followerCalls,
  followerFailures,
  hoursAfter,
  lapseDuringRead,
  lastPublished,
  postTypesSeen,
  profiles,
  publishOne,
  pullAt,
  pullOf,
  replies,
  revoked,
  scenario,
  snapshotsOf,
  startAnalytics,
  stopPosts,
} from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startAnalytics(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

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
    scenario.thrown = { kind: 'rate_limited', scope: 'account', resetAt };
    try {
      await pullAt(hoursAfter(limited, 1));
    } finally {
      scenario.thrown = null;
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

  it('stops a post type with an analytics window after the last step inside it', async () => {
    const story = await publishOne('story');
    replies.set(story.remoteId, { views: 4, reach: 3 });
    scenario.windowHours = 24;
    try {
      await pullAt(hoursAfter(story, 1));
      expect(postTypesSeen.get(story.remoteId)).toBe('post');
      expect(await pullOf(story)).toMatchObject({ step: 1 });
      await pullAt(hoursAfter(story, 6));
      expect(await pullOf(story)).toMatchObject({ step: 1, next_pull_at: null });
    } finally {
      scenario.windowHours = undefined;
    }
    expect((await snapshotsOf(story)).map((row) => [row.metric, row.value])).toEqual([
      ['reach', '3'],
      ['views', '4'],
    ]);
  });

  it('seeds no pulls for a window without the first step, and ends a row outside it', async () => {
    scenario.windowHours = 1;
    try {
      const unseeded = await publishOne('unseeded');
      const pulls = await owner.withActor(SYSTEM, (trx) =>
        trx
          .selectFrom('destination_metric_pulls')
          .select('step')
          .where('destination_id', '=', unseeded.destinationId)
          .execute(),
      );
      expect(pulls).toEqual([]);
    } finally {
      scenario.windowHours = undefined;
    }
    const narrowed = await publishOne('narrowed');
    replies.set(narrowed.remoteId, { views: 1 });
    await pullAt(hoursAfter(narrowed, 1));
    expect(await pullOf(narrowed)).toMatchObject({ step: 1 });
    const calls = analyticsCalls.get(`fake-narrowed ${lastPublished()}`);
    replies.set(narrowed.remoteId, { views: 2 });
    scenario.windowHours = 6;
    try {
      await pullAt(hoursAfter(narrowed, 6));
    } finally {
      scenario.windowHours = undefined;
    }
    expect(await pullOf(narrowed)).toMatchObject({ step: 1, next_pull_at: null });
    expect(analyticsCalls.get(`fake-narrowed ${lastPublished()}`)).toBe(calls);
    expect((await snapshotsOf(narrowed)).map((row) => row.value)).toEqual(['1']);
    scenario.windowHours = 24;
    try {
      const late = await publishOne('late-story');
      await pullAt(hoursAfter(late, 30));
      expect(await pullOf(late)).toMatchObject({ step: 0, next_pull_at: null });
      expect(analyticsCalls.has(`fake-late-story ${lastPublished()}`)).toBe(false);
    } finally {
      scenario.windowHours = undefined;
    }
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
    scenario.followers = 10;
    await pullAt(day);
    await pullAt(day.add({ minutes: 15 }));
    expect(calls()).toBe(1);
    await pullAt(day.add({ hours: 24 }));
    expect(calls()).toBe(2);
    expect(await rows()).toEqual([{ day: '2027-02-01', metric: 'followers', value: '10' }]);
    scenario.followerError = { kind: 'transient' };
    for (let run = 0; run < 4; run++) await pullAt(day.add({ hours: 48, minutes: 15 * run }));
    expect(calls()).toBe(5);
    scenario.followerError = {
      kind: 'rate_limited',
      scope: 'app',
      resetAt: day.add({ hours: 73 }),
    };
    await pullAt(day.add({ hours: 72 }));
    await pullAt(day.add({ hours: 72, minutes: 15 }));
    expect(calls()).toBe(6);
    scenario.followerError = null;
    await pullAt(day.add({ hours: 73 }));
    expect(calls()).toBe(7);
    await pullAt(day.add({ hours: 73, minutes: 15 }));
    expect(calls()).toBe(7);
  });

  it('refreshes the stored profile from the follower read while the channel is active', async () => {
    const renamed = decodePublicId('socialAccount', await insertAccount('renamed')) ?? '';
    const lapsed = decodePublicId('socialAccount', await insertAccount('lapsed')) ?? '';
    const profile = { displayName: 'Renamed', handle: '@renamed', profileUrl: 'https://x.test/r' };
    profiles.set('fake-renamed', profile).set('fake-lapsed', profile);
    lapseDuringRead.add('fake-lapsed');
    await pullAt(Temporal.Instant.from('2027-03-01T10:00:00Z'));
    const names = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select(['id', 'display_name', 'handle', 'profile_url'])
        .where('id', 'in', [renamed, lapsed])
        .execute(),
    );
    const stored = { display_name: 'Renamed', handle: '@renamed', profile_url: 'https://x.test/r' };
    expect(names).toEqual(
      expect.arrayContaining([
        { id: renamed, ...stored },
        { id: lapsed, display_name: 'lapsed', handle: null, profile_url: null },
      ]),
    );
  });

  it('only a proven dead grant lapses the channel, and only with data retention', async () => {
    const gone: ProviderError = { kind: 'permanent', code: 'channel_missing' };
    const cases: [string, ProviderError | null, string][] = [
      ['gone', gone, 'needs_reauth'],
      ['revoked', { kind: 'auth_revoked' }, 'needs_reauth'],
      ['odd', { kind: 'permanent', code: 'unexpected_status' }, 'active'],
      ['expired', { kind: 'auth_expired' }, 'active'],
      ['plain', null, 'active'],
    ];
    const ids: string[] = [];
    for (const [name, failure] of cases) {
      ids.push(decodePublicId('socialAccount', await insertAccount(`dead-${name}`)) ?? '');
      if (failure !== null) followerFailures.set(`fake-dead-${name}`, failure);
    }
    await pullAt(Temporal.Instant.from('2027-04-01T10:00:00Z'), true);
    followerFailures.set('fake-dead-plain', gone);
    await pullAt(Temporal.Instant.from('2027-04-02T10:00:00Z'));
    followerFailures.clear();
    const rows = await owner.withActor(SYSTEM, (trx) =>
      trx.selectFrom('social_accounts').select(['id', 'status']).where('id', 'in', ids).execute(),
    );
    const status = new Map(rows.map((row) => [row.id, row.status]));
    expect(ids.map((id) => status.get(id))).toEqual(cases.map(([, , expected]) => expected));
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
