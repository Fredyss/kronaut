import { randomUUID } from 'node:crypto';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setPolicy } from '../approvals/testing.ts';
import {
  type Auth,
  accountA,
  call,
  callWithKey,
  doc,
  errorOf,
  inMinutes,
  insertAccount,
  owner,
  ownerAuth,
  SYSTEM,
  startPosts,
  stopPosts,
  TZ,
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';

let test: TestDatabase;
let queued: string;

const QUEUE = { mode: 'queue' } as const;

interface ImportAnswer {
  readonly rows: { readonly outcome: string; readonly postId: string }[];
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  queued = await insertAccount('Queued');
  const slots = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) =>
    ['09:00', '21:00'].map((time) => ({ weekday, time })),
  );
  const response = await call('PUT', `channels/${queued}/queue`, ownerAuth, {
    timezone: TZ,
    slots,
  });
  expect(response.status).toBe(200);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

afterEach(async () => {
  await setPolicy({ mode: 'none' });
});

function at(minutes: number) {
  return { mode: 'instant', scheduleLocal: inMinutes(minutes), scheduleTz: TZ } as const;
}

function stored(local: string): string {
  return local.replace('T', ' ');
}

function row(accountId: string, schedule: object, text = 'Ahoj z CSV') {
  return {
    items: [{ doc: doc(text) }],
    destinations: [{ accountId, publishType: 'post' }],
    schedule,
  };
}

function importCall(body: object, auth: Auth = ownerAuth, key: string = randomUUID()) {
  return callWithKey('POST', 'post-imports', auth, { body, key });
}

function checkCall(body: object, auth: Auth = ownerAuth) {
  return call('POST', 'post-imports/checks', auth, body);
}

function internal(postId: string | null): string {
  return decodePublicId('post', postId ?? '') ?? '';
}

async function counts() {
  const result = await owner.withActor(SYSTEM, (trx) =>
    sql<{ posts: number; requests: number; jobs: number; events: number }>`
      select (select count(*)::int from posts where workspace_id = ${workspaceId}) as posts,
             (select count(*)::int from approval_requests where workspace_id = ${workspaceId}) as requests,
             (select count(*)::int from graphile_worker.jobs) as jobs,
             (select count(*)::int from webhook_events where workspace_id = ${workspaceId}) as events
    `.execute(trx),
  );
  return result.rows[0];
}

function destinationsOf(postId: string | null) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations as d')
      .innerJoin('posts as p', 'p.id', 'd.post_id')
      .select(['p.origin', 'd.state', 'd.scheduled_local', 'd.scheduled_tz'])
      .where('d.post_id', '=', internal(postId))
      .execute(),
  );
}

function requestDestinationsOf(postId: string | null) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('approval_request_destinations as rd')
      .innerJoin('approval_requests as r', 'r.id', 'rd.request_id')
      .select(['r.state', 'rd.schedule_bound', 'rd.shown_local', 'rd.shown_tz'])
      .where('r.post_id', '=', internal(postId))
      .execute(),
  );
}

describe('CSV import', () => {
  it('schedules every row in order, at its time or at the next free queue slot', async () => {
    const first = at(120);
    const second = at(180);
    const response = await importCall({
      rows: [row(accountA, first), row(accountA, second), row(queued, QUEUE)],
    });
    expect(response.status).toBe(201);
    const answer = (await response.json()) as ImportAnswer;
    expect(answer.rows.map((r) => r.outcome)).toEqual(['scheduled', 'scheduled', 'scheduled']);
    const [a, b, c] = answer.rows;
    expect(await destinationsOf(a?.postId ?? null)).toEqual([
      {
        origin: 'import',
        state: 'scheduled',
        scheduled_local: stored(first.scheduleLocal),
        scheduled_tz: TZ,
      },
    ]);
    expect((await destinationsOf(b?.postId ?? null))[0]?.scheduled_local).toBe(
      stored(second.scheduleLocal),
    );
    expect(await destinationsOf(c?.postId ?? null)).toMatchObject([
      { origin: 'import', state: 'scheduled', scheduled_tz: TZ },
    ]);
  });

  it('gives queue rows the slots in CSV order', async () => {
    const response = await importCall({ rows: [row(queued, QUEUE), row(queued, QUEUE)] });
    expect(response.status).toBe(201);
    const { rows } = (await response.json()) as ImportAnswer;
    const [first] = await destinationsOf(rows[0]?.postId ?? null);
    const [second] = await destinationsOf(rows[1]?.postId ?? null);
    expect(String(first?.scheduled_local) < String(second?.scheduled_local)).toBe(true);
  });

  it('checks an import without leaving posts, requests, jobs or events', async () => {
    const before = await counts();
    const response = await checkCall({ rows: [row(accountA, at(120)), row(queued, QUEUE)] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [{ outcome: 'scheduled' }, { outcome: 'scheduled' }],
    });
    expect(await counts()).toEqual(before);
  });

  it('replays an import for the same key without creating its posts again', async () => {
    const before = await counts();
    const key = randomUUID();
    const body = { rows: [row(accountA, at(150)), row(queued, QUEUE)] };
    const response = await importCall(body, ownerAuth, key);
    expect(response.status).toBe(201);
    const answer = await response.json();
    expect((await counts())?.posts).toBe((before?.posts ?? 0) + 2);
    const replayed = await importCall(body, ownerAuth, key);
    expect(replayed.status).toBe(201);
    expect(replayed.headers.get('idempotent-replayed')).toBe('true');
    expect(await replayed.json()).toEqual(answer);
    expect((await counts())?.posts).toBe((before?.posts ?? 0) + 2);
  });

  it('fails the whole import when one row fails, and names every bad row', async () => {
    const before = await counts();
    const empty = await insertAccount('No slots');
    const unknown = encodePublicId('socialAccount', randomUUID());
    const response = await importCall({
      rows: [row(accountA, at(120)), row(unknown, at(120)), row(empty, QUEUE)],
    });
    expect(response.status).toBe(422);
    const error = await errorOf(response);
    expect(error.code).toBe('unprocessable');
    expect(error.details).toEqual([
      { path: 'body.rows.1.destinations.0.accountId', code: 'not_found' },
      { path: 'body.rows.2.schedule.mode', code: 'queue_empty' },
    ]);
    const checked = await checkCall({ rows: [row(unknown, at(120))] });
    expect(checked.status).toBe(422);
    expect((await errorOf(checked)).details).toEqual([
      { path: 'body.rows.0.destinations.0.accountId', code: 'not_found' },
    ]);
    expect(await counts()).toEqual(before);
  });

  it('refuses a malformed row with its path before anything runs', async () => {
    const response = await importCall({ rows: [row(accountA, at(120)), row(accountA, {})] });
    expect(response.status).toBe(400);
    const paths = (await errorOf(response)).details?.map((detail) => detail.path) ?? [];
    expect(paths).toEqual(['body.rows.1.schedule.mode']);
  });

  it('APR-03 no_bypass_paths: opens approval requests when the policy asks for them', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    const time = at(240);
    const checked = await checkCall({ rows: [row(accountA, time), row(queued, QUEUE)] });
    expect(await checked.json()).toEqual({
      rows: [{ outcome: 'requested' }, { outcome: 'requested' }],
    });
    const response = await importCall({ rows: [row(accountA, time), row(queued, QUEUE)] });
    expect(response.status).toBe(201);
    const { rows } = (await response.json()) as ImportAnswer;
    expect(rows.map((r) => r.outcome)).toEqual(['requested', 'requested']);
    expect(await destinationsOf(rows[0]?.postId ?? null)).toMatchObject([{ state: 'draft' }]);
    expect(await requestDestinationsOf(rows[0]?.postId ?? null)).toEqual([
      {
        state: 'open',
        schedule_bound: true,
        shown_local: stored(time.scheduleLocal),
        shown_tz: TZ,
      },
    ]);
    expect(await requestDestinationsOf(rows[1]?.postId ?? null)).toEqual([
      { state: 'open', schedule_bound: false, shown_local: null, shown_tz: null },
    ]);
  });

  it('refuses a member who may not schedule', async () => {
    const before = await counts();
    const response = await importCall({ rows: [row(accountA, at(120))] }, viewerAuth);
    expect(response.status).toBe(403);
    expect((await checkCall({ rows: [row(accountA, at(120))] }, viewerAuth)).status).toBe(403);
    expect(await counts()).toEqual(before);
  });
});
