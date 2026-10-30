import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { decodePublicId, encodePublicId, resolveLocal } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember } from '../approvals/testing.ts';
import type { PostDto } from '../posts/dto.ts';
import {
  call,
  create,
  db,
  doc,
  draft,
  errorOf,
  insertAccount,
  internal,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  scheduleCall,
  scheduled,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from '../posts/testing.ts';

let test: TestDatabase;
const NOW = Temporal.Instant.from('2027-03-03T11:00:00Z');

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, undefined, () => NOW);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

interface Queue {
  readonly timezone: string | null;
  readonly slots: { weekday: number; time: string }[];
  readonly upcoming: { at: string; local: string; timezone: string }[];
}

type Slot = readonly [weekday: number, time: string];

function putQueue(channel: string, slots: readonly Slot[], timezone = TZ, auth = ownerAuth) {
  return call('PUT', `channels/${channel}/queue`, auth, {
    timezone,
    slots: slots.map(([weekday, time]) => ({ weekday, time })),
  });
}

async function channelWith(label: string, slots: readonly Slot[]): Promise<string> {
  const channel = await insertAccount(label);
  if (slots.length > 0) expect((await putQueue(channel, slots)).status).toBe(200);
  return channel;
}

function at(local: string): string {
  const instant = resolveLocal(Temporal.PlainDateTime.from(local), TZ).at;
  return new Date(instant.epochMilliseconds).toISOString();
}

async function queued(post: PostDto): Promise<PostDto> {
  const response = await scheduleCall(post, { mode: 'queue' });
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

async function queuedAt(channel: string): Promise<string | null> {
  const post = await queued(await create(ownerAuth, draft(channel)));
  return post.destinations[0]?.scheduledAt ?? null;
}

async function expectQueueError(response: Response, code: string, channel: string) {
  expect(response.status).toBe(422);
  const error = await errorOf(response);
  expect(error.details).toEqual([{ path: 'body.mode', code }]);
  expect(error.message).toContain(channel);
}

describe('the queue timetable', () => {
  it('replaces, reads back and clears the slots, and audits each change', async () => {
    const channel = await insertAccount('Timetable');
    const put = await putQueue(channel, [
      [3, '09:00'],
      [1, '09:00'],
    ]);
    expect(put.status).toBe(200);
    const expected: Queue = {
      timezone: TZ,
      slots: [
        { weekday: 1, time: '09:00' },
        { weekday: 3, time: '09:00' },
      ],
      upcoming: [
        { at: at('2027-03-08T09:00'), local: '2027-03-08T09:00', timezone: TZ },
        { at: at('2027-03-10T09:00'), local: '2027-03-10T09:00', timezone: TZ },
        { at: at('2027-03-15T09:00'), local: '2027-03-15T09:00', timezone: TZ },
      ],
    };
    expect(await put.json()).toEqual(expected);
    const read = await call('GET', `channels/${channel}/queue`, ownerAuth);
    expect(await read.json()).toEqual(expected);

    const replaced = await putQueue(channel, [[5, '18:30']]);
    expect(((await replaced.json()) as Queue).slots).toEqual([{ weekday: 5, time: '18:30' }]);

    const cleared = await putQueue(channel, []);
    expect(await cleared.json()).toEqual({ timezone: null, slots: [], upcoming: [] });
    const audits = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select('args_summary')
        .where('action', '=', 'channel.queue_updated')
        .where('resource_id', '=', decodePublicId('socialAccount', channel))
        .orderBy('occurred_at')
        .execute(),
    );
    expect(audits.map((a) => a.args_summary)).toEqual([
      { timezone: TZ, slots: 2 },
      { timezone: TZ, slots: 1 },
      { timezone: null, slots: 0 },
    ]);
  });

  it('lets only owners and admins change it and refuses a bad zone or a repeated slot', async () => {
    const channel = await insertAccount('Guarded');
    const editor = await addMember('queue-editor', false);
    const denied = await putQueue(channel, [[1, '09:00']], TZ, editor.auth);
    expect(denied.status).toBe(403);
    const zone = await putQueue(channel, [[1, '09:00']], 'Mars/Olympus');
    expect(zone.status).toBe(422);
    expect((await errorOf(zone)).details).toEqual([
      { path: 'body.timezone', code: 'invalid_time_zone' },
    ]);
    const twice = await putQueue(channel, [
      [1, '09:00'],
      [1, '09:00'],
    ]);
    expect(twice.status).toBe(422);
    expect((await errorOf(twice)).details).toEqual([
      { path: 'body.slots', code: 'duplicate_slot' },
    ]);
    const missing = encodePublicId('socialAccount', randomUUID());
    expect((await call('GET', `channels/${missing}/queue`, ownerAuth)).status).toBe(404);
  });
});

describe('adding to the queue', () => {
  it('takes the next free slot, keeps gaps and counts a hand-scheduled post', async () => {
    const channel = await channelWith('Weekly', [
      [1, '09:00'],
      [3, '09:00'],
    ]);
    const first = await queued(await create(ownerAuth, draft(channel)));
    expect(first.destinations[0]?.scheduledAt).toBe(at('2027-03-08T09:00'));
    expect(await queuedAt(channel)).toBe(at('2027-03-10T09:00'));

    const unscheduled = await call('POST', `posts/${first.id}/unschedule`, ownerAuth, {
      expectedVersion: first.version,
    });
    expect(unscheduled.status).toBe(200);
    expect(await queuedAt(channel)).toBe(at('2027-03-08T09:00'));

    await scheduled(await create(ownerAuth, draft(channel)), '2027-03-15T09:00');
    expect(await queuedAt(channel)).toBe(at('2027-03-17T09:00'));
  });

  it('gives each channel its own slot and stores the earliest as the post time', async () => {
    const tuesday = await channelWith('Tuesdays', [[2, '10:00']]);
    const thursday = await channelWith('Thursdays', [[4, '15:00']]);
    const post = await queued(
      await create(ownerAuth, {
        items: [{ doc: doc('Ahoj') }],
        destinations: [
          { accountId: tuesday, publishType: 'post' },
          { accountId: thursday, publishType: 'post' },
        ],
      }),
    );
    expect(post).toMatchObject({
      scheduleMode: 'local_per_destination',
      scheduleLocal: '2027-03-04T15:00:00',
      scheduleTz: TZ,
    });
    expect(post.destinations.map((d) => [d.accountId, d.scheduledAt])).toEqual([
      [tuesday, at('2027-03-09T10:00')],
      [thursday, at('2027-03-04T15:00')],
    ]);
  });

  it('moves a slot in the spring-forward gap forward, as any schedule does', async () => {
    const channel = await channelWith('Night owl', [[7, '02:30']]);
    for (const sunday of ['2027-03-07', '2027-03-14', '2027-03-21']) {
      await scheduled(await create(ownerAuth, draft(channel)), `${sunday}T02:30`);
    }
    const post = await queued(await create(ownerAuth, draft(channel)));
    const gap = resolveLocal(Temporal.PlainDateTime.from('2027-03-28T02:30'), TZ);
    expect(gap.resolution).toBe('gap_forward');
    expect(post.destinations[0]?.scheduledAt).toBe(at('2027-03-28T02:30'));
    const row = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_destinations')
        .select(['scheduled_local', 'tz_resolution'])
        .where('post_id', '=', internal(post.id))
        .executeTakeFirstOrThrow(),
    );
    expect(row).toEqual({ scheduled_local: '2027-03-28 03:30:00', tz_resolution: 'gap_forward' });
  });

  it('refuses an empty queue and a queue with no free slot in 8 weeks', async () => {
    const empty = await insertAccount('No slots');
    await expectQueueError(
      await scheduleCall(await create(ownerAuth, draft(empty)), { mode: 'queue' }),
      'queue_empty',
      empty,
    );
    const full = await channelWith('Fridays', [[5, '08:00']]);
    let friday = Temporal.PlainDate.from('2027-03-05');
    for (let week = 0; week < 8; week++) {
      await scheduled(await create(ownerAuth, draft(full)), `${friday}T08:00`);
      friday = friday.add({ weeks: 1 });
    }
    await expectQueueError(
      await scheduleCall(await create(ownerAuth, draft(full)), { mode: 'queue' }),
      'queue_full',
      full,
    );
  });

  it('serialises concurrent adds on one channel so they take different slots', async () => {
    const channel = await channelWith('Busy', [
      [1, '09:00'],
      [3, '09:00'],
    ]);
    const posts = [
      await create(ownerAuth, draft(channel)),
      await create(ownerAuth, draft(channel)),
    ];
    const key = `queue:${decodePublicId('socialAccount', channel)}`;
    const pending = await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, async (trx) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`.execute(trx);
      const calls = posts.map((post) => scheduleCall(post, { mode: 'queue' }));
      await sleep(300);
      return calls;
    });
    const responses = await Promise.all(pending);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const times = await Promise.all(
      responses.map(async (r) => ((await r.json()) as PostDto).destinations[0]?.scheduledAt),
    );
    expect(new Set(times)).toEqual(new Set([at('2027-03-08T09:00'), at('2027-03-10T09:00')]));
  });
});
