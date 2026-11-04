import { decodePublicId, encodePublicId, toDate } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  CLI,
  db,
  insertAccount,
  owner,
  providers,
  SYSTEM,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { addMember, decided, openRequestOf, setPolicy } from '../../steps/approvals/testing.ts';
import { FAKE_TEXT_MAX } from '../../steps/publish/testing/fake.ts';
import { capturedLogger } from '../media/testing/import.ts';
import { checkFeed } from './check.ts';
import { pollFeeds } from './poll.ts';
import {
  addAdmin,
  clearFeeds,
  createdFeed,
  type Entry,
  entries,
  feedAudit,
  feedCall,
  feedId,
  feedRow,
  feedServer,
  itemRows,
  queueSlots,
  rssOf,
} from './testing.ts';

const silent = pino({ level: 'silent' });
const NOW = Temporal.Instant.from('2027-01-04T06:00:00Z');
const CANARY = 'CANARY_feed_token_7777';
const feeds = feedServer();
let test: TestDatabase;
let channel: string;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, silent, () => NOW, feeds);
  channel = await insertAccount('rss-poll');
  await queueSlots(channel, [
    [1, '09:00'],
    [1, '12:00'],
    [1, '17:00'],
  ]);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
});

afterEach(async () => {
  feeds.reset();
  await clearFeeds();
});

function deps(logger = silent, at = NOW) {
  return { db, logger, providers, now: () => at, http: feeds };
}

async function savedFeed(
  mode: 'queue' | 'draft',
  old: readonly Entry[] = [],
  extra: { url?: string; template?: string } = {},
) {
  feeds.reply({ body: rssOf(old) });
  return await createdFeed({ channelIds: [channel], mode, ...extra });
}

function check(feed: { id: string }, logger = silent, at = NOW) {
  return checkFeed(deps(logger, at), { workspaceId, id: feedId(feed.id) });
}

function postsOf(feed: { id: string }) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('rss_items as i')
      .innerJoin('posts as p', 'p.id', 'i.post_id')
      .innerJoin('post_destinations as d', 'd.post_id', 'p.id')
      .select(['i.outcome', 'p.origin', 'p.publish_summary', 'd.state', 'd.scheduled_local'])
      .where('i.feed_id', '=', feedId(feed.id))
      .orderBy('d.scheduled_local')
      .orderBy('p.id')
      .execute(),
  );
}

describe('a check in queue mode', () => {
  it('schedules new items, oldest first, at the next free slots, as the owner', async () => {
    const old = entries('old', 2);
    const feed = await savedFeed('queue', old);
    const fresh = entries('new', 2).reverse();
    feeds.reply({ body: rssOf([...fresh, ...old]), headers: { etag: '"v2"' } });

    expect(await check(feed)).toBe('checked');

    const posts = await postsOf(feed);
    expect(posts).toEqual([
      {
        outcome: 'scheduled',
        origin: 'rss',
        publish_summary: 'scheduled',
        state: 'scheduled',
        scheduled_local: '2027-01-04 09:00:00',
      },
      {
        outcome: 'scheduled',
        origin: 'rss',
        publish_summary: 'scheduled',
        state: 'scheduled',
        scheduled_local: '2027-01-04 12:00:00',
      },
    ]);
    const texts = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('rss_items as i')
        .innerJoin('variant_items as t', 't.post_id', 'i.post_id')
        .select(['t.doc'])
        .where('i.feed_id', '=', feedId(feed.id))
        .orderBy('i.created_at')
        .execute(),
    );
    expect(JSON.stringify(texts)).toContain('new 0 https://blog.example.test/new/0');
    expect(await feedRow(feed.id)).toMatchObject({ etag: '"v2"', last_error: null });
  });

  it('opens an approval request when the policy asks for one', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false });
    const feed = await savedFeed('queue');
    feeds.reply({ body: rssOf(entries('ask', 1)) });
    await check(feed);
    const [post] = await postsOf(feed);
    expect(post).toMatchObject({ outcome: 'requested', publish_summary: 'in_review' });
    const requests = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('rss_items as i')
        .innerJoin('approval_requests as a', 'a.post_id', 'i.post_id')
        .innerJoin('approval_request_destinations as d', 'd.request_id', 'a.id')
        .select(['a.state', 'd.schedule_bound'])
        .where('i.feed_id', '=', feedId(feed.id))
        .execute(),
    );
    expect(requests).toEqual([{ state: 'open', schedule_bound: false }]);
  });

  it('revisits requests first: approved ones get a slot, rejected ones stay drafts', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false });
    const approver = await addMember('rss-approver', true);
    const feed = await savedFeed('queue');
    const waiting = entries('wait', 2);
    feeds.reply({ body: rssOf(waiting) });
    await check(feed);
    const [first, second] = await itemRows(feed.id);
    const request = (row: typeof first) =>
      openRequestOf({ id: encodePublicId('post', row?.post_id ?? '') } as PostDto);
    await decided(await request(first), 'approve', approver.auth);
    await decided(await request(second), 'reject', approver.auth);
    feeds.reply({ body: rssOf([...entries('more', 5), ...waiting]) });
    await check(feed, silent, NOW.add({ minutes: 10 }));
    const rows = await itemRows(feed.id);
    expect(rows.slice(0, 2).map((row) => row.outcome)).toEqual(['scheduled', 'drafted']);
    expect(rows.length).toBe(5);
    expect(await postsOf(feed)).toContainEqual(
      expect.objectContaining({
        outcome: 'scheduled',
        publish_summary: 'scheduled',
        state: 'scheduled',
      }),
    );
  });

  it('leaves a draft when the queue has no slots', async () => {
    const feed = await savedFeed('queue');
    const bare = await insertAccount('rss-bare');
    await owner.withActor(CLI, (trx) =>
      trx
        .insertInto('rss_feed_channels')
        .values({
          workspace_id: workspaceId,
          feed_id: feedId(feed.id),
          social_account_id: decodePublicId('socialAccount', bare) ?? '',
        })
        .execute(),
    );
    feeds.reply({ body: rssOf(entries('bare', 1)) });
    await check(feed);
    const posts = await postsOf(feed);
    expect(posts.map((p) => [p.outcome, p.publish_summary, p.state])).toEqual([
      ['drafted', 'draft', 'draft'],
      ['drafted', 'draft', 'draft'],
    ]);
  });

  it('fails only the item whose content cannot be scheduled', async () => {
    const feed = await savedFeed('queue');
    const long = { title: 'x'.repeat(FAKE_TEXT_MAX + 1), link: 'https://blog.example.test/long' };
    feeds.reply({ body: rssOf([long, ...entries('ok', 1)]) });
    await check(feed);
    const rows = await itemRows(feed.id);
    expect(rows.map((row) => [row.outcome, row.error_code, row.post_id === null])).toEqual(
      expect.arrayContaining([
        ['failed', 'preflight_failed', false],
        ['scheduled', null, false],
      ]),
    );
  });

  it('takes at most 5 new items per check and keeps no validators until the rest are in', async () => {
    const feed = await savedFeed('draft');
    const fresh = entries('many', 7);
    feeds.reply({ body: rssOf(fresh), headers: { etag: '"v7"' } });
    await check(feed);
    expect((await itemRows(feed.id)).length).toBe(5);
    expect(await feedRow(feed.id)).toMatchObject({ etag: null });
    feeds.reply({ body: rssOf(fresh), headers: { etag: '"v7"' } });
    await check(feed);
    const rows = await itemRows(feed.id);
    expect(rows.map((row) => row.outcome)).toEqual(Array(7).fill('drafted'));
    expect(await feedRow(feed.id)).toMatchObject({ etag: '"v7"' });
  });
});

describe('a check in draft mode', () => {
  it('leaves every new item a draft', async () => {
    const feed = await savedFeed('draft', [], { template: '{title}\n{summary}' });
    feeds.reply({
      body: rssOf([{ ...entries('d', 1)[0], description: '&lt;p&gt;Body&lt;/p&gt;' }]),
    });
    await check(feed);
    expect(await postsOf(feed)).toMatchObject([
      { outcome: 'drafted', publish_summary: 'draft', state: 'draft' },
    ]);
  });
});

describe('conditional requests', () => {
  it('sends the last validators and treats 304 as nothing new', async () => {
    feeds.reply({
      body: rssOf(entries('v', 1)),
      headers: { etag: '"e1"', 'last-modified': 'Sat' },
    });
    const feed = await createdFeed({ channelIds: [channel], mode: 'draft' });
    const later = NOW.add({ hours: 1 });
    feeds.reply({ status: 304 });
    expect(await check(feed, silent, later)).toBe('not_modified');
    expect(feeds.requests[1]?.headers).toMatchObject({
      'if-none-match': '"e1"',
      'if-modified-since': 'Sat',
    });
    const [item] = await itemRows(feed.id);
    expect(item?.last_seen_at).toEqual(toDate(later));
    expect(await feedRow(feed.id)).toMatchObject({ last_checked_at: toDate(later) });
    expect(await postsOf(feed)).toEqual([]);
  });
});

describe('failures', () => {
  it('pauses the feed when its owner may no longer schedule', async () => {
    const admin = await addAdmin('rss-admin');
    feeds.reply({ body: rssOf([]) });
    const feed = await createdFeed({ channelIds: [channel], mode: 'queue' }, admin.auth);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ role: 'viewer' })
        .where('user_id', '=', admin.id)
        .execute(),
    );
    feeds.reply({ body: rssOf(entries('lost', 2)) });
    expect(await check(feed)).toBe('paused');
    expect(await feedRow(feed.id)).toMatchObject({ state: 'paused', paused_reason: 'owner_lost' });
    expect(await itemRows(feed.id)).toEqual([]);
    expect((await feedAudit(feed.id)).at(-1)).toMatchObject({
      action: 'rss_feed.paused',
      actor_kind: 'system',
      args_summary: { reason: 'owner_lost' },
    });
  });

  it('SEC-02 rss_feed_url_secret: keeps the last error, pauses after 24 h, never logs the URL', async () => {
    const feed = await savedFeed('draft', [], { url: `https://blog.example.test/f?t=${CANARY}` });
    const { logger, lines } = capturedLogger();
    feeds.reply({ status: 503 });
    expect(await check(feed, logger)).toBe('failed');
    expect(await feedRow(feed.id)).toMatchObject({
      state: 'active',
      last_error: 'fetch_failed',
      failing_since: toDate(NOW),
    });
    feeds.reply({ body: 'not xml' });
    expect(await check(feed, logger, NOW.add({ hours: 23 }))).toBe('failed');
    feeds.reply({ error: new Error(`connect ECONNREFUSED ${CANARY}`) });
    expect(await check(feed, logger, NOW.add({ hours: 24 }))).toBe('paused');
    expect(await feedRow(feed.id)).toMatchObject({
      state: 'paused',
      paused_reason: 'fetch_failing',
      last_error: 'fetch_failed',
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('')).not.toContain(CANARY);
    expect(JSON.stringify(await feedAudit(feed.id))).not.toContain(CANARY);
  });

  it('clears the error once a check succeeds', async () => {
    const feed = await savedFeed('draft');
    feeds.reply({ status: 500 });
    await check(feed);
    feeds.reply({ body: rssOf([]) });
    await check(feed, silent, NOW.add({ minutes: 15 }));
    expect(await feedRow(feed.id)).toMatchObject({ last_error: null, failing_since: null });
  });
});

describe('the rss_poll task', () => {
  it('queues one job per due active feed, with ids only', async () => {
    const due = await savedFeed('draft', [], { url: `https://blog.example.test/a?t=${CANARY}` });
    const paused = await savedFeed('draft');
    expect((await feedCall('PATCH', `/${paused.id}`, { paused: true })).status).toBe(200);
    await pollFeeds({ db, logger: silent, providers, now: () => NOW.add({ minutes: 9 }) });
    expect(await queuedJobs()).toEqual([]);
    await pollFeeds({ db, logger: silent, providers, now: () => NOW.add({ minutes: 10 }) });
    const jobs = await queuedJobs();
    expect(jobs).toEqual([
      { payload: { workspaceId, id: feedId(due.id) }, queue: 'rss', key: `rss:${feedId(due.id)}` },
    ]);
    expect(JSON.stringify(jobs)).not.toContain(CANARY);
  });

  it("removes items not seen for 30 days before the feed's own last check", async () => {
    const feed = await savedFeed('draft', entries('gc', 2));
    const idle = await savedFeed('draft', entries('idle', 1));
    const [stale] = await itemRows(feed.id);
    await owner.withActor(CLI, async (trx) => {
      const ago = (days: number) => toDate(NOW.subtract({ hours: days * 24 }));
      await trx
        .updateTable('rss_items')
        .set({ last_seen_at: ago(31) })
        .where('key', '=', stale?.key ?? Buffer.alloc(32))
        .execute();
      await trx
        .updateTable('rss_feeds')
        .set({ last_checked_at: ago(40) })
        .where('id', '=', feedId(idle.id))
        .execute();
      await trx
        .updateTable('rss_items')
        .set({ last_seen_at: ago(45) })
        .where('feed_id', '=', feedId(idle.id))
        .execute();
    });
    await pollFeeds({ db, logger: silent, providers, now: () => NOW });
    expect((await itemRows(feed.id)).length).toBe(1);
    expect((await itemRows(idle.id)).length).toBe(1);
  });
});

function queuedJobs() {
  return owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ payload: unknown; queue: string | null; key: string | null }>`
      select j.payload, q.queue_name as queue, j.key
        from graphile_worker._private_jobs j
        join graphile_worker._private_tasks t on t.id = j.task_id
        left join graphile_worker._private_job_queues q on q.id = j.job_queue_id
       where t.identifier = 'rss'
    `.execute(trx);
    return rows;
  });
}
