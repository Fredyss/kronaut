import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { EgressError } from '@kronaut/egress';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  accountA,
  call,
  db,
  errorOf,
  grantAuth,
  insertAccount,
  owner,
  providers,
  SYSTEM,
  startPosts,
  stopPosts,
  viewerAuth,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { checkFeed } from './check.ts';
import {
  clearFeeds,
  createdFeed,
  entries,
  FEED_URL,
  feedAudit,
  feedCall,
  feedId,
  feedRow,
  feedServer,
  itemRows,
  queueSlots,
  rssOf,
} from './testing.ts';

const logger = pino({ level: 'silent' });
const NOW = Temporal.Instant.from('2027-01-04T06:00:00Z');
const CANARY = 'CANARY_feed_token_4242';
const feeds = feedServer();
let test: TestDatabase;
let queued: string;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, logger, () => NOW, feeds);
  queued = await insertAccount('rss-queued');
  await queueSlots(queued, [[1, '17:00']]);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

afterEach(async () => {
  feeds.reset();
  await clearFeeds();
});

function postCount() {
  return owner.withActor(SYSTEM, async (trx) => {
    const { n } = await trx
      .selectFrom('posts')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('origin', '=', 'rss')
      .executeTakeFirstOrThrow();
    return Number(n);
  });
}

async function listed() {
  const response = await feedCall('GET');
  expect(response.status).toBe(200);
  return ((await response.json()) as { items: unknown[] }).items;
}

describe('saving a feed', () => {
  it('runs the first check and marks every item seen, so nothing old is posted', async () => {
    feeds.reply({ body: rssOf(entries('old', 3)), headers: { etag: '"v1"' } });
    const feed = await createdFeed({ channelIds: [queued], mode: 'queue' });
    expect(feed).toMatchObject({
      url: FEED_URL,
      name: 'Blog',
      channelIds: [queued],
      mode: 'queue',
      template: '{title} {link}',
      state: 'active',
      pausedReason: null,
      lastCheckedAt: NOW.toString().replace('Z', '.000Z'),
      lastError: null,
    });
    expect((await itemRows(feed.id)).map((row) => row.outcome)).toEqual(['seen', 'seen', 'seen']);
    expect(await feedRow(feed.id)).toMatchObject({ etag: '"v1"', state: 'active' });

    feeds.reply({ body: rssOf(entries('old', 3)) });
    const deps = { db, logger, providers, now: () => NOW, http: feeds };
    expect(await checkFeed(deps, { workspaceId, id: feedId(feed.id) })).toBe('checked');
    expect(feeds.requests[1]?.headers['if-none-match']).toBe('"v1"');
    expect(await postCount()).toBe(0);
  });

  it('refuses bad fields, unknown channels and an empty queue', async () => {
    const empty = await insertAccount('rss-empty');
    const cases = [
      [{ url: 'http://blog.example.test/feed' }, 'body.url', 'url_invalid'],
      [{ url: 'https://user:pw@blog.example.test/feed' }, 'body.url', 'url_invalid'],
      [{ name: '   ' }, 'body.name', 'name_invalid'],
      [{ template: 'x'.repeat(1001) }, 'body.template', 'template_invalid'],
      [{ channelIds: ['acct_nope'] }, 'body.channelIds.0', 'not_found'],
      [{ channelIds: [queued, empty], mode: 'queue' }, 'body.channelIds.1', 'queue_empty'],
    ] as const;
    for (const [patch, path, code] of cases) {
      const body = { url: FEED_URL, name: 'Blog', channelIds: [queued], mode: 'queue', ...patch };
      const response = await feedCall('POST', '', body);
      expect(response.status).toBe(422);
      expect((await errorOf(response)).details).toEqual([{ path, code }]);
    }
    expect(feeds.requests).toEqual([]);
    feeds.reply({ body: rssOf([]) });
    await createdFeed({ channelIds: [empty], mode: 'draft' });
  });

  it('answers feed_unreachable or feed_invalid and keeps nothing', async () => {
    const failures = [
      [{ status: 500 }, 'feed_unreachable'],
      [
        { error: new EgressError('blocked_address', `${FEED_URL}?token=${CANARY}`) },
        'feed_unreachable',
      ],
      [{ body: '<html><body>Hello</body></html>' }, 'feed_invalid'],
      [{ body: '<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "a">]><rss/>' }, 'feed_invalid'],
    ] as const;
    for (const [reply, code] of failures) {
      feeds.reply(reply);
      const response = await feedCall('POST', '', {
        url: `${FEED_URL}?token=${CANARY}`,
        name: 'Blog',
        channelIds: [accountA],
        mode: 'draft',
      });
      expect(response.status).toBe(422);
      const error = await errorOf(response);
      expect(error.details).toEqual([{ path: 'body.url', code }]);
      expect(JSON.stringify(error)).not.toContain(CANARY);
    }
    expect(await listed()).toEqual([]);
  });

  it('allows at most 20 feeds per workspace', async () => {
    for (let n = 0; n < 20; n++) {
      feeds.reply({ body: rssOf([]) });
      await createdFeed({ name: `Feed ${n}`, channelIds: [accountA], mode: 'draft' });
    }
    feeds.reply({ body: rssOf([]) });
    const response = await feedCall('POST', '', {
      url: FEED_URL,
      name: 'One too many',
      channelIds: [accountA],
      mode: 'draft',
    });
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('rss_feed_limit');
  });

  it('is for owners and admins in a session only', async () => {
    const body = { url: FEED_URL, name: 'Blog', channelIds: [accountA], mode: 'draft' };
    expect((await call('POST', 'rss-feeds', viewerAuth, body)).status).toBe(403);
    expect((await call('GET', 'rss-feeds', viewerAuth)).status).toBe(403);
    expect((await call('GET', 'rss-feeds', grantAuth)).status).toBe(401);
    expect(feeds.requests).toEqual([]);
  });
});

describe('changing a feed', () => {
  it('lists, renames, pauses, resumes, re-checks a new URL and deletes, auditing each step', async () => {
    feeds.reply({ body: rssOf(entries('a', 1)) });
    const feed = await createdFeed({ channelIds: [accountA], mode: 'draft' });

    const renamed = await feedCall('PATCH', `/${feed.id}`, { name: 'Renamed', paused: true });
    expect(await renamed.json()).toMatchObject({
      name: 'Renamed',
      state: 'paused',
      pausedReason: 'manual',
    });
    const resumed = await feedCall('PATCH', `/${feed.id}`, { paused: false });
    expect(await resumed.json()).toMatchObject({ state: 'active', pausedReason: null });

    const moved = `https://news.example.test/rss?token=${CANARY}`;
    feeds.reply({ body: rssOf(entries('b', 2)), headers: { 'last-modified': 'Sun, 03 Jan 2027' } });
    const changed = await feedCall('PATCH', `/${feed.id}`, { url: moved });
    expect(changed.status).toBe(200);
    expect(feeds.requests.at(-1)).toMatchObject({ url: moved });
    expect(feeds.requests.at(-1)?.headers['if-modified-since']).toBeUndefined();
    expect((await itemRows(feed.id)).map((row) => row.outcome)).toEqual(['seen', 'seen', 'seen']);
    expect(await feedRow(feed.id)).toMatchObject({ url: moved, last_modified: 'Sun, 03 Jan 2027' });

    expect(await listed()).toMatchObject([{ id: feed.id, url: moved, name: 'Renamed' }]);

    expect((await feedCall('DELETE', `/${feed.id}`)).status).toBe(204);
    expect((await feedCall('PATCH', `/${feed.id}`, { name: 'Gone' })).status).toBe(404);

    const audit = await feedAudit(feed.id);
    const actions = audit.map((row) => row.action);
    expect(actions.splice(1, 2).sort()).toEqual(['rss_feed.paused', 'rss_feed.updated']);
    expect(actions).toEqual([
      'rss_feed.created',
      'rss_feed.resumed',
      'rss_feed.updated',
      'rss_feed.deleted',
    ]);
    expect(audit.every((row) => row.actor_kind === 'user')).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(CANARY);
    expect(audit[4]?.args_summary).toMatchObject({ urlChanged: true, renamed: false });
  });

  it('re-checks the queue of every channel when switching to queue mode', async () => {
    feeds.reply({ body: rssOf([]) });
    const empty = await insertAccount('rss-switch');
    const feed = await createdFeed({ channelIds: [empty], mode: 'draft' });
    const response = await feedCall('PATCH', `/${feed.id}`, { mode: 'queue' });
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.channelIds.0', code: 'queue_empty' },
    ]);
  });
});
