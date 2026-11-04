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
import { enqueueFeedCheck } from '../../infrastructure/jobs/jobs.ts';
import { checkFeed } from './check.ts';
import {
  clearFeeds,
  createdFeed,
  type Entry,
  entries,
  failOnBoom,
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
let plainChannel: string;
let providers: ReturnType<typeof createProviderRegistry>;

function limited(type: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  const limit = (capabilities as { limit?: string } | null)?.limit;
  if (limit === 'media') return { ...type, media: { ...type.media, minCount: 1 } };
  if (limit === 'text') return { ...type, media: { ...type.media, maxCount: 0 } };
  return type;
}

async function limitedChannel(label: string, limit: 'media' | 'text') {
  const channel = await insertAccount(label);
  await owner.withActor(CLI, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ capabilities: JSON.stringify({ limit }) })
      .where('id', '=', decodePublicId('socialAccount', channel) ?? '')
      .execute(),
  );
  return channel;
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, silent, () => NOW, feeds);
  const manifest: ProviderManifest = { ...fake.manifest, accountPostType: limited };
  providers = createProviderRegistry([manifest], [fake.runtime]);
  textChannel = await insertAccount('rss-text');
  imageChannel = await limitedChannel('rss-image', 'media');
  plainChannel = await limitedChannel('rss-plain', 'text');
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
  return owner.withActor(SYSTEM, async (trx) => {
    const { rows } = await sql<{
      outcome: string;
      text: string | null;
      social_account_id: string;
      asset_id: string | null;
    }>`
      select i.outcome, i.text, d.social_account_id,
        (select im.media_asset_id from post_variants pv
           join variant_items v on v.variant_id = pv.id
           join item_media im on im.item_id = v.id
          where pv.post_id = d.post_id
            and (pv.id = d.variant_id or (d.variant_id is null and pv.is_default))) as asset_id
        from rss_items i join post_destinations d on d.post_id = i.post_id
       where i.feed_id = ${feedId(feed.id)}
       order by i.created_at, i.key, d.social_account_id`.execute(trx);
    return rows;
  });
}

function rssJobs() {
  return owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ run_at: Date; key: string | null; locked: boolean }>`
      select j.run_at, j.key, j.locked_at is not null as locked from graphile_worker._private_jobs j
        join graphile_worker._private_tasks t on t.id = j.task_id
       where t.identifier = 'rss' order by j.id`.execute(trx);
    return rows;
  });
}

describe('an item with an image', () => {
  it('fetches the image first, checks again 2 min later and posts it with the asset', async () => {
    const feed = await feedWith([textChannel, imageChannel]);
    const body = rssOf(pictured('pic', 1));
    expect(await check(feed, body)).toBe('checked');
    const [started] = await imports(feed);
    expect(started).toMatchObject({ state: 'pending', text: expect.stringContaining('pic 0') });
    expect((await rssJobs()).map((row) => row.run_at)).toEqual([toDate(NOW.add({ minutes: 2 }))]);

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

  it('counts only the images that settle toward the 5 per check', async () => {
    const feed = await feedWith([textChannel]);
    const body = rssOf(pictured('many', 10));
    await check(feed, body);
    const [first] = await imports(feed);
    await settleImport(first?.id ?? '', 'done');
    await check(feed, body, 2);
    const rows = await itemRows(feed.id);
    expect(rows.map((row) => row.outcome).sort()).toEqual([
      'drafted',
      ...Array(8).fill('fetching_media'),
    ]);
  });

  it('keeps the text and the import while a settling item is retried, then fails it', async () => {
    const feed = await feedWith([textChannel]);
    const [entry] = pictured('retry', 1);
    const body = rssOf([{ ...entry, title: 'BOOM' }]);
    await check(feed, body);
    const [started] = await imports(feed);
    await settleImport(started?.id ?? '', 'done');
    await failOnBoom(true);
    try {
      const seen = [];
      for (const n of [1, 2, 3]) {
        await check(feed, body, 2 * n);
        const [row] = await itemRows(feed.id);
        const [kept] = await imports(feed);
        seen.push([
          row?.outcome,
          row?.error_code,
          row?.attempts,
          kept?.id === started?.id,
          kept?.text !== null,
        ]);
      }
      expect(seen).toEqual([
        ['fetching_media', null, 1, true, true],
        ['fetching_media', null, 2, true, true],
        ['failed', 'item_failed', 3, true, false],
      ]);
    } finally {
      await failOnBoom(false);
    }
  });

  it('queues the follow-up 2 min ahead from inside the running job', async () => {
    const feed = await feedWith([textChannel]);
    const job = { workspaceId, id: feedId(feed.id) };
    await owner.withActor(CLI, async (trx) => {
      await enqueueFeedCheck(trx, job);
      await sql`update graphile_worker._private_jobs set locked_at = now(), locked_by = 'test'`.execute(
        trx,
      );
    });
    await check(feed, rssOf(pictured('queued', 1)));
    expect(await rssJobs()).toEqual([
      { run_at: expect.any(Date), key: null, locked: true },
      { run_at: toDate(NOW.add({ minutes: 2 })), key: `rss:${job.id}`, locked: false },
    ]);
  });
});

describe('channels per item', () => {
  it('gives a channel that cannot take the image the text alone', async () => {
    const feed = await feedWith([imageChannel, plainChannel]);
    const body = rssOf(pictured('split', 1));
    await check(feed, body);
    const [started] = await imports(feed);
    await settleImport(started?.id ?? '', 'done');
    await check(feed, body, 2);
    const asset = decodePublicId('media', readyMedia);
    const byChannel = (await postsOf(feed)).map((post) => [post.social_account_id, post.asset_id]);
    expect(byChannel).toEqual(
      expect.arrayContaining([
        [decodePublicId('socialAccount', imageChannel), asset],
        [decodePublicId('socialAccount', plainChannel), null],
      ]),
    );
    expect(byChannel).toHaveLength(2);
  });

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
