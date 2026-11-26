import type { ProviderError } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertAccount } from '../../flow/posts/testing.ts';
import {
  analyticsCalls,
  followerCalls,
  followerFailures,
  hoursAfter,
  lastPublished,
  publishOne,
  pullAt,
  pullOf,
  replies,
  scenario,
  snapshotsOf,
  startAnalytics,
  stopPosts,
} from './testing.ts';

const CREDITS: ProviderError = { kind: 'permanent', code: 'credits_depleted' };
let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startAnalytics(test);
  scenario.analytics = { pullHours: [24, 168, 696], followersEveryDays: 7, purgeOnMissing: true };
});

afterAll(async () => {
  scenario.analytics = undefined;
  await stopPosts();
  await test?.stop();
});

function at(target: { publishedAt: Temporal.Instant }, hours: number) {
  return new Date(target.publishedAt.add({ hours }).epochMilliseconds);
}

describe('a provider pull schedule', () => {
  it('seeds the first pull at its first offset and steps through its own offsets', async () => {
    const target = await publishOne('schedule');
    expect(await pullOf(target)).toEqual({ step: 0, attempts: 0, next_pull_at: at(target, 24) });
    replies.set(target.remoteId, { likes: 1 });
    await pullAt(hoursAfter(target, 6));
    expect(analyticsCalls.has(`fake-schedule ${lastPublished()}`)).toBe(false);
    await pullAt(hoursAfter(target, 24));
    expect(await pullOf(target)).toEqual({ step: 1, attempts: 0, next_pull_at: at(target, 168) });
    await pullAt(hoursAfter(target, 168));
    expect(await pullOf(target)).toEqual({ step: 2, attempts: 0, next_pull_at: at(target, 696) });
    await pullAt(hoursAfter(target, 696));
    expect(await pullOf(target)).toEqual({ step: 2, attempts: 0, next_pull_at: null });
    expect(analyticsCalls.get(`fake-schedule ${lastPublished()}`)).toBe(3);
  });

  it('deletes the snapshots of a post the network reports missing, not on a failed request', async () => {
    const gone = await publishOne('purged');
    const kept = await publishOne('kept');
    replies.set(gone.remoteId, { likes: 3 }).set(kept.remoteId, { likes: 2 });
    await pullAt(hoursAfter(gone, 24));
    expect(await snapshotsOf(gone)).toHaveLength(1);
    replies.set(gone.remoteId, { kind: 'permanent', code: 'not_found' });
    await pullAt(hoursAfter(gone, 168));
    expect(await pullOf(gone)).toMatchObject({ step: 1, next_pull_at: null });
    expect(await snapshotsOf(gone)).toEqual([]);
    scenario.thrown = { kind: 'permanent', code: 'not_found' };
    try {
      await pullAt(hoursAfter(kept, 696));
    } finally {
      scenario.thrown = null;
    }
    expect(await pullOf(kept)).toMatchObject({ step: 2, next_pull_at: null });
    expect(await snapshotsOf(kept)).toHaveLength(1);
  });

  it('spent credits pause the channel for a day and keep its pulls', async () => {
    const target = await publishOne('broke');
    scenario.thrown = CREDITS;
    try {
      await pullAt(hoursAfter(target, 24));
    } finally {
      scenario.thrown = null;
    }
    const resumed = hoursAfter(target, 24).add({ hours: 24 });
    expect(await pullOf(target)).toEqual({
      step: 0,
      attempts: 0,
      next_pull_at: new Date(resumed.epochMilliseconds),
    });
  });
});

describe('a provider follower cadence', () => {
  const day = Temporal.Instant.from('2027-06-01T10:00:00Z');

  it('reads the follower count once every 7 days', async () => {
    await insertAccount('weekly');
    const calls = () => followerCalls.get('fake-weekly') ?? 0;
    await pullAt(day);
    await pullAt(day.add({ hours: 6 * 24 }));
    expect(calls()).toBe(1);
    await pullAt(day.add({ hours: 7 * 24 }));
    expect(calls()).toBe(2);
  });

  it('retries a follower read a day after the credits ran out', async () => {
    await insertAccount('spent');
    const calls = () => followerCalls.get('fake-spent') ?? 0;
    followerFailures.set('fake-spent', CREDITS);
    await pullAt(day);
    await pullAt(day.add({ hours: 1 }));
    expect(calls()).toBe(1);
    followerFailures.delete('fake-spent');
    await pullAt(day.add({ hours: 24 }));
    expect(calls()).toBe(2);
  });
});
