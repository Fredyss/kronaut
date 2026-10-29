import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, setPolicy } from '../approvals/testing.ts';
import type { PostDto } from '../posts/dto.ts';
import {
  type Auth,
  accountB,
  CLI,
  call,
  create,
  db,
  doc,
  draft,
  grantAuth,
  insertAccount,
  internal,
  owner,
  ownerAuth,
  providers,
  SYSTEM,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';
import { fillEvergreen } from './fill.ts';

const logger = pino({ level: 'silent' });
const NOW = Temporal.Instant.from('2027-01-04T06:00:00Z');
let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, logger, () => NOW);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
});

afterEach(async () => {
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('evergreen_posts')
      .set({ state: 'removed', state_reason: 'unmarked' })
      .where('state', '=', 'active')
      .execute(),
  );
});

type Slot = readonly [weekday: number, time: string];

async function channelWith(label: string, slots: readonly Slot[]): Promise<string> {
  const channel = await insertAccount(label);
  const response = await call('PUT', `channels/${channel}/queue`, ownerAuth, {
    timezone: TZ,
    slots: slots.map(([weekday, time]) => ({ weekday, time })),
  });
  expect(response.status).toBe(200);
  return channel;
}

function evergreen(method: 'PUT' | 'DELETE' | 'GET', post: PostDto, auth: Auth = ownerAuth) {
  return call(method, `posts/${post.id}/evergreen`, auth);
}

async function pooled(channel: string, text = 'Evergreen', auth: Auth = ownerAuth) {
  const post = await create(auth, { ...draft(channel), items: [{ doc: doc(text) }] });
  expect((await evergreen('PUT', post, auth)).status).toBe(200);
  return post;
}

async function fill(): Promise<void> {
  await fillEvergreen({ db, logger, providers, now: () => NOW });
}

function copiesOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('evergreen_runs as r')
      .innerJoin('posts as c', 'c.id', 'r.copy_post_id')
      .innerJoin('post_destinations as d', 'd.post_id', 'c.id')
      .select(['r.slot_at', 'c.id', 'c.origin', 'c.series_id', 'c.publish_summary'])
      .select(['d.social_account_id', 'd.state', 'd.scheduled_local', 'd.scheduled_at'])
      .where('r.evergreen_post_id', '=', internal(post.id))
      .orderBy('r.slot_at')
      .execute(),
  );
}

async function usedBefore(post: PostDto, channel: string, days: number, copy?: PostDto) {
  await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('evergreen_runs')
      .values({
        workspace_id: workspaceId,
        evergreen_post_id: internal(post.id),
        social_account_id: decodePublicId('socialAccount', channel) ?? '',
        copy_post_id: copy === undefined ? null : internal(copy.id),
        slot_at: new Date(NOW.subtract({ hours: days * 24 }).epochMilliseconds),
      })
      .execute(),
  );
}

function accountId(channel: string): string {
  return decodePublicId('socialAccount', channel) ?? '';
}

describe('the evergreen pool', () => {
  it('marks, unmarks and re-marks a post, and reports it', async () => {
    const channel = await insertAccount('eg-mark');
    const post = await create(ownerAuth, draft(channel));
    expect((await evergreen('GET', post)).status).toBe(404);
    expect((await evergreen('PUT', post, viewerAuth)).status).toBe(403);
    const marked = await evergreen('PUT', post);
    expect(await marked.json()).toEqual({ state: 'active', stateReason: null, recent: [] });
    expect((await evergreen('PUT', post)).status).toBe(200);
    const read = (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
    expect(read.evergreen).toBe('active');
    expect(await (await evergreen('DELETE', post)).json()).toMatchObject({
      state: 'removed',
      stateReason: 'unmarked',
    });
    expect(await (await evergreen('GET', post, viewerAuth)).json()).toMatchObject({
      state: 'removed',
    });
    expect(await (await evergreen('PUT', post, grantAuth)).json()).toMatchObject({
      state: 'active',
      stateReason: null,
    });
    const row = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('evergreen_posts')
        .select(['owner_user_id', 'owner_grant_id'])
        .where('post_id', '=', internal(post.id))
        .executeTakeFirstOrThrow(),
    );
    expect(row.owner_user_id).toBeNull();
    expect(row.owner_grant_id).not.toBeNull();
    const audit = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_kind'])
        .where('resource_id', '=', internal(post.id))
        .orderBy('occurred_at')
        .orderBy('id')
        .execute(),
    );
    expect(audit).toEqual([
      { action: 'evergreen.marked', actor_kind: 'user' },
      { action: 'evergreen.unmarked', actor_kind: 'user' },
      { action: 'evergreen.marked', actor_kind: 'grant' },
    ]);
  });
});

describe('filling free queue slots', () => {
  it('schedules a copy at a slot 10 h ahead, on that channel only', async () => {
    const channel = await channelWith('eg-fill', [[1, '17:00']]);
    const post = await create(ownerAuth, {
      items: [{ doc: doc('Evergreen') }],
      destinations: [
        { accountId: channel, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    });
    expect((await evergreen('PUT', post)).status).toBe(200);
    await fill();
    await fill();
    const copies = await copiesOf(post);
    expect(copies).toEqual([
      expect.objectContaining({
        origin: 'duplicate',
        series_id: null,
        publish_summary: 'scheduled',
        social_account_id: accountId(channel),
        state: 'scheduled',
        scheduled_local: '2027-01-04 17:00:00',
      }),
    ]);
    expect(copies[0]?.scheduled_at?.toISOString()).toBe('2027-01-04T16:00:00.000Z');
    expect(await (await evergreen('GET', post)).json()).toMatchObject({
      recent: [
        {
          channelId: channel,
          slotAt: '2027-01-04T16:00:00.000Z',
          copyPostId: encodePublicId('post', copies[0]?.id ?? ''),
        },
      ],
    });
  });

  it('leaves a slot more than 24 h ahead alone', async () => {
    const channel = await channelWith('eg-far', [[2, '13:00']]);
    const post = await pooled(channel);
    await fill();
    expect(await copiesOf(post)).toEqual([]);
  });

  it('skips a post copied on the channel 10 days ago and picks another', async () => {
    const channel = await channelWith('eg-recent', [[1, '17:00']]);
    const recent = await pooled(channel, 'Used lately');
    const other = await pooled(channel, 'Rested');
    await usedBefore(recent, channel, 10);
    await fill();
    expect(await copiesOf(recent)).toEqual([]);
    expect(await copiesOf(other)).toEqual([
      expect.objectContaining({ scheduled_local: '2027-01-04 17:00:00', state: 'scheduled' }),
    ]);
  });

  it('lets a missed draft copy stop blocking once the 30-day gap has passed', async () => {
    const channel = await channelWith('eg-missed', [
      [1, '12:00'],
      [1, '17:00'],
    ]);
    const lapsed = await pooled(channel, 'Missed long ago');
    const lately = await pooled(channel, 'Missed lately');
    await usedBefore(lapsed, channel, 31, await create(ownerAuth, draft(channel)));
    await usedBefore(lately, channel, 2, await create(ownerAuth, draft(channel)));
    await fill();
    expect((await copiesOf(lapsed)).map((c) => c.scheduled_local)).toEqual([
      null,
      '2027-01-04 12:00:00',
    ]);
    expect(await copiesOf(lately)).toHaveLength(1);
  });

  it('uses each pool post once per run, least recently used first', async () => {
    const channel = await channelWith('eg-two', [
      [1, '12:00'],
      [1, '17:00'],
    ]);
    const older = await pooled(channel, 'Older');
    const newer = await pooled(channel, 'Newer');
    await usedBefore(older, channel, 40);
    await fill();
    expect((await copiesOf(newer)).map((c) => c.scheduled_local)).toEqual(['2027-01-04 12:00:00']);
    expect((await copiesOf(older)).map((c) => c.scheduled_local)).toEqual(['2027-01-04 17:00:00']);
  });

  it('asks for approval bound to the slot when one is required, and schedules nothing', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    const channel = await channelWith('eg-approval', [[1, '17:00']]);
    const post = await pooled(channel);
    await fill();
    await fill();
    const copies = await copiesOf(post);
    expect(copies).toEqual([
      expect.objectContaining({ publish_summary: 'in_review', state: 'draft' }),
    ]);
    const requests = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('approval_requests as a')
        .innerJoin('approval_request_destinations as d', 'd.request_id', 'a.id')
        .select(['a.state', 'd.schedule_bound', 'd.shown_local', 'd.shown_tz'])
        .where('a.post_id', '=', copies[0]?.id ?? '')
        .execute(),
    );
    expect(requests).toEqual([
      { state: 'open', schedule_bound: true, shown_local: '2027-01-04 17:00:00', shown_tz: TZ },
    ]);
  });

  it('takes a post out of the pool when its owner may no longer schedule', async () => {
    const channel = await channelWith('eg-owner', [[1, '17:00']]);
    const editor = await addMember('eg-editor', false);
    const post = await pooled(channel, 'Editor post', editor.auth);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ role: 'viewer' })
        .where('user_id', '=', editor.id)
        .execute(),
    );
    await fill();
    expect(await copiesOf(post)).toEqual([]);
    expect(await (await evergreen('GET', post)).json()).toMatchObject({
      state: 'removed',
      stateReason: 'owner_lost',
    });
    const audit = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_kind', 'error_code'])
        .where('resource_id', '=', internal(post.id))
        .where('action', '=', 'evergreen.removed')
        .execute(),
    );
    expect(audit).toEqual([
      { action: 'evergreen.removed', actor_kind: 'system', error_code: 'owner_lost' },
    ]);
  });

  it('never fills a slot a hand-queued post already took', async () => {
    const channel = await channelWith('eg-taken', [[1, '17:00']]);
    const queued = await create(ownerAuth, draft(channel));
    expect((await scheduleCall(queued, { mode: 'queue' })).status).toBe(200);
    const post = await pooled(channel);
    await fill();
    expect(await copiesOf(post)).toEqual([]);
  });
});
