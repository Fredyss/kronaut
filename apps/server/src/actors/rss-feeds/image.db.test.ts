import type { PostTypeSpec, ProviderManifest } from '@kronaut/core';
import { decodePublicId, toDate } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createProviderRegistry } from '../../base/providers/providers.ts';
import {
  CLI,
  db,
  fake,
  insertAccount,
  owner,
  readyMedia,
  SYSTEM,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { checkFeed } from './check.ts';
import {
  clearFeeds,
  createdFeed,
  type Entry,
  entries,
  feedCall,
  feedId,
  feedServer,
  itemRows,
  rssOf,
} from './testing.ts';

const silent = pino({ level: 'silent' });
const NOW = Temporal.Now.instant();
const feeds = feedServer();
let test: TestDatabase;
let textChannel: string;
let imageChannel: string;
let providers: ReturnType<typeof createProviderRegistry>;

function mediaOnly(type: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  if ((capabilities as { mediaOnly?: boolean } | null)?.mediaOnly !== true) return type;
  return { ...type, media: { ...type.media, minCount: 1 } };
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, silent, () => NOW, feeds);
  const manifest: ProviderManifest = { ...fake.manifest, accountPostType: mediaOnly };
  providers = createProviderRegistry([manifest], [fake.runtime]);
  textChannel = await insertAccount('rss-text');
  imageChannel = await insertAccount('rss-image');
  await owner.withActor(CLI, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ capabilities: JSON.stringify({ mediaOnly: true }) })
      .where('id', '=', decodePublicId('socialAccount', imageChannel) ?? '')
      .execute(),
  );
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

afterEach(async () => {
  feeds.reset();
  await clearFeeds();
});

const pictured = (prefix: string, count: number): Entry[] =>
  entries(prefix, count).map((entry, n) => ({
    ...entry,
    image: `https://cdn.example.test/${prefix}/${n}.jpg`,
  }));

async function feedWith(channelIds: readonly string[]) {
  feeds.reply({ body: rssOf([]) });
  return await createdFeed({ channelIds, mode: 'draft' });
}

function check(feed: { id: string }, body: string, minutes = 0) {
  feeds.reply({ body });
  const deps = { db, logger: silent, providers, now: () => NOW.add({ minutes }), http: feeds };
  return checkFeed(deps, { workspaceId, id: feedId(feed.id) });
}

function imports(feed: { id: string }) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('rss_items as i')
      .innerJoin('media_imports as m', 'm.id', 'i.media_import_id')
      .select(['m.id', 'm.state', 'i.text'])
      .where('i.feed_id', '=', feedId(feed.id))
      .orderBy('i.created_at')
      .execute(),
  );
}

function settleImport(id: string, change: 'done' | 'failed' | 'stale') {
  const set =
    change === 'stale'
      ? { created_at: toDate(NOW.subtract({ minutes: 61 })) }
      : change === 'done'
        ? {
            state: 'done',
            url: null,
            finished_at: new Date(),
            media_id: decodePublicId('media', readyMedia),
          }
        : { state: 'failed', url: null, finished_at: new Date(), error: 'fetch_failed' };
  return owner.withActor(CLI, (trx) =>
    trx.updateTable('media_imports').set(set).where('id', '=', id).execute(),
  );
}

function postsOf(feed: { id: string }) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('rss_items as i')
      .innerJoin('post_destinations as d', 'd.post_id', 'i.post_id')
      .innerJoin('variant_items as v', 'v.post_id', 'i.post_id')
      .leftJoin('item_media as im', 'im.item_id', 'v.id')
      .select(['i.outcome', 'i.text', 'd.social_account_id', 'im.media_asset_id as asset_id'])
      .where('i.feed_id', '=', feedId(feed.id))
      .orderBy('i.created_at')
      .execute(),
  );
}

function rssJobRunAt() {
  return owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ run_at: Date }>`
      select j.run_at from graphile_worker._private_jobs j
        join graphile_worker._private_tasks t on t.id = j.task_id
       where t.identifier = 'rss'`.execute(trx);
    return rows.map((row) => row.run_at);
  });
}

describe('an item with an image', () => {
  it('fetches the image first, checks again 2 min later and posts it with the asset', async () => {
    const feed = await feedWith([textChannel, imageChannel]);
    const body = rssOf(pictured('pic', 1));
    expect(await check(feed, body)).toBe('checked');
    const [started] = await imports(feed);
    expect(started).toMatchObject({ state: 'pending', text: expect.stringContaining('pic 0') });
    expect(await rssJobRunAt()).toEqual([toDate(NOW.add({ minutes: 2 }))]);

    await settleImport(started?.id ?? '', 'done');
    await check(feed, body, 2);
    const posts = await postsOf(feed);
    expect(posts).toHaveLength(2);
    expect(posts.every((post) => post.outcome === 'drafted' && post.text === null)).toBe(true);
    expect(posts.every((post) => post.asset_id === decodePublicId('media', readyMedia))).toBe(true);
  });

  it('goes out as text when the import failed or is still running after 1 h, without media-only channels', async () => {
    const feed = await feedWith([textChannel, imageChannel]);
    const body = rssOf(pictured('fall', 2));
    await check(feed, body);
    const [failed, stale] = await imports(feed);
    await settleImport(failed?.id ?? '', 'failed');
    await settleImport(stale?.id ?? '', 'stale');
    await check(feed, body, 2);
    const posts = await postsOf(feed);
    expect(posts.map((post) => [post.outcome, post.social_account_id, post.asset_id])).toEqual([
      ['drafted', decodePublicId('socialAccount', textChannel), null],
      ['drafted', decodePublicId('socialAccount', textChannel), null],
    ]);
  });

  it('counts images still being fetched toward the 5 per check', async () => {
    const feed = await feedWith([textChannel]);
    const body = rssOf(pictured('many', 6));
    await check(feed, body);
    await check(feed, body, 2);
    const rows = await itemRows(feed.id);
    expect(rows.map((row) => row.outcome)).toEqual(Array(5).fill('fetching_media'));
  });
});

describe('channels per item', () => {
  it('skips an item no channel can take', async () => {
    const feed = await feedWith([imageChannel]);
    await check(feed, rssOf(entries('plain', 1)));
    expect(await itemRows(feed.id)).toMatchObject([{ outcome: 'skipped', post_id: null }]);
  });

  it('refuses to save a channel that can post neither text nor one image', async () => {
    const retired = await insertAccount('rss-retired');
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('social_accounts')
        .set({ provider: 'retired' })
        .where('id', '=', decodePublicId('socialAccount', retired) ?? '')
        .execute(),
    );
    const response = await feedCall('POST', '', {
      url: 'https://blog.example.test/feed.xml',
      name: 'Blog',
      channelIds: [retired],
      mode: 'draft',
    });
    expect(response.status).toBe(422);
    expect(JSON.stringify(await response.json())).toContain('channel_unsupported');
  });
});
