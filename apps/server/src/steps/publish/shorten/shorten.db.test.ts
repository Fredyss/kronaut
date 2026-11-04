import { contentHash } from '@kronaut/compose';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../../../flow/posts/read/dto.ts';
import {
  accountA,
  BASE,
  CLI,
  call,
  create,
  db,
  doc,
  fake,
  internal,
  keyring,
  media,
  owner,
  ownerAuth,
  providers,
  requested,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../../flow/posts/testing.ts';
import { purgeShortLinks } from '../../../records/short-links/gc.ts';
import { dubLink, shortenerServer } from '../../../records/short-links/testing.ts';
import {
  addMember,
  decided,
  type Member,
  openRequestOf,
  setPolicy,
} from '../../approvals/testing.ts';
import { contentHashInput, parseSnapshot, publishItems, resolveDestination } from '../snapshot.ts';
import { publishDeps, runPublish } from '../task.ts';
import { FAKE_TEXT_MAX } from '../testing.ts';
import { shortLinksTask } from './ensure.ts';

const KEY = 'dub_CANARY_pipeline_3c8d';
const LINK_A = 'https://blog.example.test/a';
const LINK_B = 'https://blog.example.test/b?x=1';
const TAGS = 'utm_source=fake&utm_medium=social&utm_campaign=kronaut';
const TARGET_A = `${LINK_A}?${TAGS}`;
const TARGET_B = `${LINK_B}&${TAGS}`;
const TEXT = `Read ${LINK_A} and ${LINK_B}.`;
const server = shortenerServer();
let test: TestDatabase;
let approver: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, pino({ level: 'silent' }), undefined, server);
  approver = await addMember('short-approver', true);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
});

afterEach(async () => {
  server.reset();
  await owner.withActor(CLI, async (trx) => {
    await trx.deleteFrom('link_shorteners').execute();
    await trx.updateTable('social_accounts').set({ shorten_links: true }).execute();
    await sql`delete from graphile_worker._private_jobs`.execute(trx);
  });
});

function deps(budgetMs = 2000) {
  return publishDeps({
    db,
    providers,
    keyring,
    media,
    logger: pino({ level: 'silent' }),
    workerId: 'short-links-test',
    publicBaseUrl: BASE,
    shortLinks: { http: server, budgetMs },
  });
}

async function connectDub() {
  server.reply({ body: [] });
  const response = await call('POST', 'link-shortener', ownerAuth, {
    provider: 'dub',
    apiKey: KEY,
  });
  expect(response.status).toBe(201);
  server.reset();
}

function draftWith(text: string) {
  return create(ownerAuth, {
    items: [{ doc: doc(text) }],
    destinations: [{ accountId: accountA, publishType: 'post' }],
  });
}

function destination(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations as d')
      .innerJoin('post_revisions as r', (join) =>
        join
          .onRef('r.workspace_id', '=', 'd.workspace_id')
          .onRef('r.post_id', '=', 'd.post_id')
          .onRef('r.post_version', '=', 'd.frozen_post_version'),
      )
      .select(['d.id', 'd.state', 'd.content_hash', 'r.snapshot'])
      .where('d.post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
}

async function shortJob(id: string) {
  const result = await owner.withActor(CLI, (trx) =>
    sql<{ payload: unknown; queue_name: string | null }>`
      select j.payload, q.queue_name from graphile_worker._private_jobs j
        left join graphile_worker._private_job_queues q on q.id = j.job_queue_id
       where j.key = ${`short-links:${id}`}
    `.execute(trx),
  );
  return result.rows[0];
}

function runJob(id: string) {
  return shortLinksTask(deps())({ workspaceId, id }, {} as JobHelpers);
}

function links(id: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('short_links')
      .select(['long_url', 'target', 'short_url', 'link_id', 'state', 'error_code', 'attempts'])
      .where('destination_id', '=', id)
      .orderBy('long_url')
      .execute(),
  );
}

async function publishNow(id: string, budgetMs?: number) {
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set run_at = now() - interval '1 second' where id = ${id}`.execute(
      trx,
    ),
  );
  await runPublish(deps(budgetMs), { workspaceId, id });
}

function resolvedOf(snapshot: unknown) {
  const parsed = parseSnapshot(snapshot);
  const socialAccountId = parsed.destinations[0]?.socialAccountId ?? '';
  return resolveDestination(parsed, { socialAccountId, publishType: 'post' });
}

function sentText(): string | undefined {
  return fake.calls.at(-1)?.items[0]?.text;
}

function renderedText(id: string) {
  return owner.withActor(SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('destination_items')
      .select('rendered_text')
      .where('destination_id', '=', id)
      .executeTakeFirstOrThrow();
    return row.rendered_text;
  });
}

describe('freezing', () => {
  it('records shorten and enqueues the job only when the channel and the workspace have it', async () => {
    const without = await destination(await scheduled(await draftWith(TEXT)));
    expect(parseSnapshot(without.snapshot).destinations[0]).not.toHaveProperty('shorten');
    expect(await shortJob(without.id)).toBeUndefined();

    await connectDub();
    await call('PUT', `channels/${accountA}/shorten-links`, ownerAuth, { shortenLinks: false });
    const off = await destination(await scheduled(await draftWith(TEXT)));
    expect(parseSnapshot(off.snapshot).destinations[0]).not.toHaveProperty('shorten');
    expect(await shortJob(off.id)).toBeUndefined();

    await call('PUT', `channels/${accountA}/shorten-links`, ownerAuth, { shortenLinks: true });
    const on = await destination(await scheduled(await draftWith(TEXT)));
    expect(parseSnapshot(on.snapshot).destinations[0]?.shorten).toBe(true);
    expect(await shortJob(on.id)).toEqual({
      payload: { workspaceId, id: on.id },
      queue_name: 'short-links',
    });
    expect(server.calls).toEqual([]);
  });

  it('leaves the approval hash as it is without shortening', async () => {
    const plain = await destination(await scheduled(await draftWith(TEXT)));
    await connectDub();
    const shortened = await destination(await scheduled(await draftWith(TEXT)));
    expect(shortened.content_hash).toEqual(plain.content_hash);
    const resolved = resolvedOf(shortened.snapshot);
    expect(Buffer.from(await contentHash(contentHashInput(resolved)))).toEqual(
      shortened.content_hash,
    );
  });
});

describe('the short links job', () => {
  it('creates each link with UTM tags and a Dub external id', async () => {
    await connectDub();
    const { id } = await destination(await scheduled(await draftWith(TEXT)));
    server.reply({ body: dubLink('aaa', TARGET_A) }, { body: dubLink('bbb', TARGET_B) });
    await runJob(id);

    expect(server.calls.map((c) => c.body)).toEqual(
      expect.arrayContaining([
        {
          url: TARGET_A,
          externalId: expect.stringMatching(new RegExp(`^kronaut_${id}_[0-9a-f]{64}$`)),
        },
        { url: TARGET_B, externalId: expect.stringMatching(/^kronaut_/) },
      ]),
    );
    const rows = await links(id);
    expect(rows.map((row) => [row.long_url, row.state, row.attempts])).toEqual([
      [LINK_A, 'ready', 1],
      [LINK_B, 'ready', 1],
    ]);
    expect(rows.map((row) => row.target).sort()).toEqual([TARGET_A, TARGET_B]);

    await runJob(id);
    expect(server.calls).toHaveLength(2);
  });

  it('resolves a Dub 409 by reading the link back by its external id', async () => {
    await connectDub();
    const { id } = await destination(await scheduled(await draftWith(`See ${LINK_A}`)));
    server.reply({ status: 409, body: { error: { code: 'conflict' } } });
    server.reply({ body: dubLink('back', TARGET_A) });
    await runJob(id);
    expect(server.calls[1]?.url).toMatch(
      /^https:\/\/api\.dub\.co\/links\/info\?externalId=ext_kronaut_/,
    );
    expect(await links(id)).toMatchObject([
      { state: 'ready', short_url: 'https://dub.sh/back', link_id: 'back' },
    ]);
  });

  it('retries a failing shortener three times in all, then fails the link by kind', async () => {
    await connectDub();
    const { id } = await destination(await scheduled(await draftWith(`See ${LINK_A}`)));
    for (let run = 1; run <= 2; run++) {
      server.reply({ status: 503 });
      await expect(runJob(id)).rejects.toThrow('waiting for a retry');
      expect(await links(id)).toMatchObject([{ state: 'pending', attempts: run }]);
    }
    server.reply({ status: 503 });
    await runJob(id);
    expect(await links(id)).toMatchObject([
      { state: 'failed', error_code: 'unavailable', attempts: 3 },
    ]);
  });
});

describe('the swap at the first claim', () => {
  it('ensures the links before the claim and sends the short ones', async () => {
    await connectDub();
    const { id } = await destination(await scheduled(await draftWith(TEXT)));
    server.reply({ body: dubLink('aaa', TARGET_A) }, { body: dubLink('bbb', TARGET_B) });
    fake.script({ kind: 'publish', remoteId: `r-${id}` });
    await publishNow(id);
    const short = 'Read https://dub.sh/aaa and https://dub.sh/bbb.';
    expect(sentText()).toBe(short);
    expect(await renderedText(id)).toBe(short);
  });

  it('publishes the long links when the shortener fails or runs out of time', async () => {
    await connectDub();
    const refused = await destination(await scheduled(await draftWith(TEXT)));
    server.reply({ status: 401 }, { status: 401 });
    fake.script({ kind: 'publish', remoteId: `r-${refused.id}` });
    await publishNow(refused.id);
    expect(sentText()).toBe(TEXT);
    expect(await links(refused.id)).toMatchObject([
      { state: 'failed', error_code: 'unauthorized' },
      { state: 'failed', error_code: 'unauthorized' },
    ]);

    const slow = await destination(await scheduled(await draftWith(TEXT)));
    server.reply({ hang: true });
    fake.script({ kind: 'publish', remoteId: `r-${slow.id}` });
    await publishNow(slow.id, 50);
    expect(sentText()).toBe(TEXT);
    expect((await links(slow.id)).map((row) => row.state)).toEqual(['pending', 'pending']);
  });

  it('keeps an item long when its short links would break the text limit', async () => {
    await connectDub();
    const link = 'https://a.test/x';
    const text = `${'x'.repeat(FAKE_TEXT_MAX - link.length - 1)} ${link}`;
    const { id } = await destination(await scheduled(await draftWith(text)));
    server.reply({
      body: { ...dubLink('l', `${link}?${TAGS}`), shortLink: `https://dub.sh/${'y'.repeat(40)}` },
    });
    fake.script({ kind: 'publish', remoteId: `r-${id}` });
    await publishNow(id);
    expect(await links(id)).toMatchObject([{ state: 'ready' }]);
    expect(sentText()).toBe(text);
  });

  it('reuses the rendered text on a retry', async () => {
    await connectDub();
    const { id } = await destination(await scheduled(await draftWith(`See ${LINK_A}`)));
    server.reply({ body: dubLink('first', TARGET_A) });
    fake.script({ kind: 'fail', error: { kind: 'transient' }, at: 'before_public' });
    await publishNow(id);
    expect(sentText()).toBe('See https://dub.sh/first');
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('short_links')
        .set({ short_url: 'https://dub.sh/second' })
        .where('destination_id', '=', id)
        .execute(),
    );
    fake.script({ kind: 'publish', remoteId: `r-${id}` });
    await publishNow(id);
    expect(sentText()).toBe('See https://dub.sh/first');
    expect(server.calls).toHaveLength(1);
  });

  it('publishes a post approved with its long links through its short ones', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false, reschedule_tolerance_min: 60 });
    await connectDub();
    const post = await requested(await draftWith(`See ${LINK_A}`));
    await decided(await openRequestOf(post), 'approve', approver.auth);
    const current = (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
    const { id } = await destination(await scheduled(current));
    server.reply({ body: dubLink('ok', TARGET_A) });
    fake.script({ kind: 'publish', remoteId: `r-${id}` });
    await publishNow(id);
    expect(sentText()).toBe('See https://dub.sh/ok');
    expect((await destination(current)).state).toBe('published');
  });

  it('sends the same provider input as before when shortening is off', async () => {
    const texts = ['Ahoj', `Link ${LINK_A}`, 'Cafe\u0301 ü', `${LINK_B} trailing.`];
    for (const text of texts) {
      const frozen = await destination(await scheduled(await draftWith(text)));
      fake.script({ kind: 'publish', remoteId: `r-${frozen.id}` });
      await publishNow(frozen.id);
      expect(fake.calls.at(-1)?.items).toEqual(publishItems(resolvedOf(frozen.snapshot)));
    }
    expect(server.calls).toEqual([]);
  });
});

async function agedBy(id: string, days: number) {
  await owner.withActor(CLI, async (trx) => {
    await sql`set local session_replication_role = replica`.execute(trx);
    await sql`update post_destinations set updated_at = now() - make_interval(days => ${days})
      where id = ${id}`.execute(trx);
  });
}

describe('GC', () => {
  it('drops the rows 90 days after their destination reached a final state', async () => {
    await connectDub();
    const ids: string[] = [];
    for (const name of ['old', 'recent', 'waiting']) {
      const { id } = await destination(await scheduled(await draftWith(`${name} ${LINK_A}`)));
      server.reply({ body: dubLink(name, TARGET_A) });
      await runJob(id);
      ids.push(id);
    }
    const [old = '', recent = '', waiting = ''] = ids;
    for (const id of [old, recent]) {
      fake.script({ kind: 'publish', remoteId: `r-${id}` });
      await publishNow(id);
    }
    await agedBy(old, 91);
    await agedBy(recent, 10);
    await agedBy(waiting, 200);

    expect(await purgeShortLinks(db)).toBe(1);
    expect(await links(old)).toEqual([]);
    expect(await links(recent)).toHaveLength(1);
    expect(await links(waiting)).toHaveLength(1);
  });
});
