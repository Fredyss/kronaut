import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  decided,
  openRequestOf,
  requestCall,
  requested,
  setPolicy,
} from '../approvals/testing.ts';
import type { PostDto } from '../posts/dto.ts';
import {
  type Auth,
  CLI,
  call,
  create,
  db,
  doc,
  draft,
  errorOf,
  internal,
  login,
  owner,
  ownerAuth,
  ownerId,
  providers,
  SYSTEM,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
} from '../posts/testing.ts';
import { FAKE_TEXT_MAX } from '../publish/testing-fake.ts';
import { advanceSeries } from './advance.ts';

const logger = pino({ level: 'silent' });
let test: TestDatabase;
let now = Temporal.Instant.from('2027-01-04T06:00:00Z');

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, logger, () => now);
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
      .updateTable('post_series')
      .set({ state: 'stopped' })
      .where('state', '=', 'active')
      .execute(),
  );
});

interface SeriesDto {
  readonly id: string;
  readonly state: string;
  readonly stateReason: string | null;
  readonly occurrences: number;
  readonly nextLocal: string | null;
  readonly dtstartLocal: string;
  readonly rule: object;
}

function at(iso: string): void {
  now = Temporal.Instant.from(iso);
}

async function reauth(): Promise<void> {
  await owner.withActor(CLI, (trx) =>
    trx
      .updateTable('sessions')
      .set({ reauthenticated_at: new Date(now.epochMilliseconds) })
      .where('user_id', '=', ownerId)
      .execute(),
  );
}

async function advance(): Promise<void> {
  await advanceSeries({ db, logger, providers, now: () => now });
}

async function repeating(local: string, repeat: object, auth: Auth = ownerAuth) {
  const post = await create(auth, draft());
  const response = await scheduleCall(
    post,
    { mode: 'instant', scheduleLocal: local, scheduleTz: TZ, repeat },
    auth,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

async function postOf(id: string): Promise<PostDto> {
  return (await (await call('GET', `posts/${id}`, ownerAuth)).json()) as PostDto;
}

function requestsOn(postId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('approval_requests')
      .select(['state', 'void_reason'])
      .where('post_id', '=', postId)
      .orderBy('created_at')
      .orderBy('id')
      .execute(),
  );
}

async function seriesOf(post: PostDto): Promise<SeriesDto> {
  const response = await call('GET', `series/${post.seriesId}`, ownerAuth);
  expect(response.status).toBe(200);
  return (await response.json()) as SeriesDto;
}

function occurrences(post: PostDto) {
  const seriesId = decodePublicId('series', post.seriesId ?? '') ?? '';
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('posts as p')
      .leftJoin('post_destinations as d', 'd.post_id', 'p.id')
      .select(['p.id', 'p.origin', 'p.schedule_mode', 'p.schedule_local', 'p.publish_summary'])
      .select(['p.created_by_user_id', 'd.state', 'd.scheduled_local', 'd.scheduled_at'])
      .select('d.scheduled_by_user_id')
      .where('p.series_id', '=', seriesId)
      .orderBy('p.created_at')
      .orderBy('p.id')
      .execute(),
  );
}

describe('creating a series', () => {
  it('stores the rule and links occurrence 1', async () => {
    const post = await repeating('2027-01-05T09:00', { freq: 'daily', interval: 2, count: 3 });
    expect(post.seriesId).toMatch(/^ser_/);
    expect(await seriesOf(post)).toMatchObject({
      state: 'active',
      occurrences: 1,
      dtstartLocal: '2027-01-05T09:00:00',
      nextLocal: '2027-01-05T09:00:00',
      rule: { freq: 'daily', interval: 2, count: 3 },
    });
  });

  it('refuses a rule outside the subset and repeat outside fixed-time mode', async () => {
    const post = await create(ownerAuth, draft());
    const body = { mode: 'instant', scheduleLocal: '2027-01-05T09:00', scheduleTz: TZ };
    const bad = await scheduleCall(post, { ...body, repeat: { freq: 'daily', byMonthDay: 3 } });
    expect(bad.status).toBe(422);
    expect((await errorOf(bad)).details).toEqual([{ path: 'body.repeat', code: 'invalid_repeat' }]);
    const asap = await scheduleCall(post, { mode: 'asap', repeat: { freq: 'daily' } });
    expect(asap.status).toBe(400);
  });

  it('refuses repeat from someone who may only submit', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    const contributor = await addMember('series-contributor', false);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ role: 'contributor' })
        .where('user_id', '=', contributor.id)
        .execute(),
    );
    const post = await create(contributor.auth, draft());
    const schedule = { scheduleLocal: '2027-01-05T09:00', scheduleTz: TZ };
    const response = await requestCall(
      post,
      { schedule, repeat: { freq: 'daily' } },
      contributor.auth,
    );
    expect(response.status).toBe(403);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.repeat', code: 'repeat_needs_schedule' },
    ]);
    expect(await requestsOn(internal(post.id))).toEqual([]);
  });
});

describe('advancing a series', () => {
  it('clones the next occurrence once its time has come, then schedules it', async () => {
    const post = await repeating('2027-01-05T09:00', { freq: 'daily' });
    at('2027-01-05T07:30:00Z');
    await advance();
    expect(await occurrences(post)).toHaveLength(1);
    at('2027-01-05T08:00:00Z');
    await advance();
    const [, second] = await occurrences(post);
    expect(second).toMatchObject({
      origin: 'recurrence',
      schedule_mode: 'instant',
      schedule_local: '2027-01-06 09:00:00',
      publish_summary: 'draft',
      created_by_user_id: ownerId,
      state: 'draft',
    });
    await advance();
    expect((await occurrences(post))[1]).toMatchObject({
      publish_summary: 'scheduled',
      state: 'scheduled',
      scheduled_local: '2027-01-06 09:00:00',
      scheduled_by_user_id: ownerId,
    });
    expect((await seriesOf(post)).occurrences).toBe(2);
  });

  it('creates one occurrence however often or concurrently it runs', async () => {
    const post = await repeating('2027-01-12T09:00', { freq: 'weekly', byDay: ['tu'] });
    at('2027-01-12T08:00:00Z');
    await Promise.all([advance(), advance()]);
    await advance();
    await advance();
    const rows = await occurrences(post);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ scheduled_local: '2027-01-19 09:00:00', state: 'scheduled' });
  });

  it('opens an approval request when one is required, and schedules once it is approved', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    at('2027-01-04T06:00:00Z');
    const created = await create(ownerAuth, draft());
    const schedule = { scheduleLocal: '2027-01-06T10:00', scheduleTz: TZ };
    const inReview = await requested(created, { schedule });
    await reauth();
    await decided(await openRequestOf(inReview), 'approve', ownerAuth);
    const fresh = (await (await call('GET', `posts/${created.id}`, ownerAuth)).json()) as PostDto;
    const response = await scheduleCall(fresh, {
      mode: 'instant',
      ...schedule,
      repeat: { freq: 'monthly', byMonthDay: 6 },
    });
    expect(response.status).toBe(200);
    const post = (await response.json()) as PostDto;
    at('2027-01-06T09:00:00Z');
    await advance();
    await advance();
    const [, second] = await occurrences(post);
    expect(second).toMatchObject({ publish_summary: 'in_review', state: 'draft' });
    const next = (await (
      await call('GET', `posts/${encodePublicId('post', second?.id ?? '')}`, ownerAuth)
    ).json()) as PostDto;
    const request = await openRequestOf(next);
    expect(request).toMatchObject({ state: 'open' });
    await reauth();
    await decided(request, 'approve', ownerAuth);
    await advance();
    expect((await occurrences(post))[1]).toMatchObject({
      state: 'scheduled',
      scheduled_local: '2027-02-06 10:00:00',
    });
  });

  it('starts from an approval request and schedules occurrence 1 once approved', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    at('2027-01-04T06:00:00Z');
    const created = await create(ownerAuth, draft());
    const schedule = { scheduleLocal: '2027-01-10T11:00', scheduleTz: TZ };
    const alone = await call('POST', `posts/${created.id}/approval-requests`, ownerAuth, {
      expectedVersion: created.version,
      repeat: { freq: 'daily' },
    });
    expect(alone.status).toBe(422);
    expect((await errorOf(alone)).details).toEqual([
      { path: 'body.repeat', code: 'invalid_repeat' },
    ]);
    const post = await requested(created, { schedule, repeat: { freq: 'weekly', byDay: ['su'] } });
    expect(post.seriesId).toMatch(/^ser_/);
    await advance();
    expect((await occurrences(post))[0]).toMatchObject({ publish_summary: 'in_review' });
    await reauth();
    await decided(await openRequestOf(post), 'approve', ownerAuth);
    await advance();
    expect(await occurrences(post)).toEqual([
      expect.objectContaining({ state: 'scheduled', scheduled_local: '2027-01-10 11:00:00' }),
    ]);
    expect(await occurrences(post)).toEqual([
      expect.objectContaining({ scheduled_by_user_id: ownerId }),
    ]);
    const fresh = (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
    const byHand = await scheduleCall(fresh, { mode: 'instant', ...schedule });
    expect(byHand.status).toBe(409);
    await advance();
    expect(await occurrences(post)).toHaveLength(1);
    at('2027-01-10T10:00:00Z');
    await advance();
    const [, second] = await occurrences(post);
    expect(second).toMatchObject({ schedule_local: '2027-01-17 11:00:00', state: 'draft' });
  });

  it('asks again when the approved content changed', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    at('2027-01-04T06:00:00Z');
    const created = await create(ownerAuth, draft());
    const schedule = { scheduleLocal: '2027-01-10T11:00', scheduleTz: TZ };
    const post = await requested(created, { schedule, repeat: { freq: 'daily' } });
    await reauth();
    await decided(await openRequestOf(post), 'approve', ownerAuth);
    const approved = await postOf(post.id);
    const edit = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: approved.version,
      items: [{ doc: doc('Changed after approval') }],
    });
    expect(edit.status).toBe(200);
    await advance();
    expect(await requestsOn(internal(post.id))).toEqual([
      { state: 'approved', void_reason: null },
      { state: 'open', void_reason: null },
    ]);
    expect((await occurrences(post))[0]).toMatchObject({ state: 'draft' });
  });

  it('voids a request still open when its time passes, and moves on', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: true });
    at('2027-01-04T06:00:00Z');
    const created = await create(ownerAuth, draft());
    const schedule = { scheduleLocal: '2027-01-11T11:00', scheduleTz: TZ };
    const post = await requested(created, { schedule, repeat: { freq: 'daily' } });
    at('2027-01-11T10:00:00Z');
    await advance();
    expect(await requestsOn(internal(post.id))).toEqual([
      { state: 'voided', void_reason: 'schedule_changed' },
    ]);
    const [, second] = await occurrences(post);
    expect(second).toMatchObject({ schedule_local: '2027-01-12 11:00:00', state: 'draft' });
  });

  it('pauses when an occurrence keeps failing for a reason only a person can fix', async () => {
    at('2027-01-04T06:00:00Z');
    const post = await repeating('2027-01-06T09:00', { freq: 'daily' });
    at('2027-01-06T08:00:00Z');
    await advance();
    const [, second] = await occurrences(post);
    const clone = await postOf(encodePublicId('post', second?.id ?? ''));
    const edit = await call('PATCH', `posts/${clone.id}`, ownerAuth, {
      expectedVersion: clone.version,
      items: [{ doc: doc('x'.repeat(FAKE_TEXT_MAX + 1)) }],
    });
    expect(edit.status).toBe(200);
    await advance();
    expect(await seriesOf(post)).toMatchObject({ state: 'paused', stateReason: 'advance_failed' });
    const audit = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_kind', 'error_code'])
        .where('resource_id', '=', decodePublicId('series', post.seriesId ?? ''))
        .execute(),
    );
    expect(audit).toEqual([
      { action: 'series.paused', actor_kind: 'system', error_code: 'preflight_failed' },
    ]);
  });

  it('ends once its only occurrence is deleted', async () => {
    at('2027-01-04T06:00:00Z');
    const post = await repeating('2027-01-13T09:00', { freq: 'daily' });
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('posts')
        .set({ deleted_at: new Date(now.epochMilliseconds) })
        .where('id', '=', internal(post.id))
        .execute(),
    );
    await advance();
    expect(await seriesOf(post)).toMatchObject({
      state: 'ended',
      stateReason: 'occurrences_deleted',
    });
  });

  it('ends after COUNT occurrences', async () => {
    at('2027-01-04T06:00:00Z');
    const post = await repeating('2027-01-07T09:00', { freq: 'daily', count: 2 });
    at('2027-01-07T08:00:00Z');
    await advance();
    at('2027-01-08T08:00:00Z');
    await advance();
    expect(await occurrences(post)).toHaveLength(2);
    expect(await seriesOf(post)).toMatchObject({
      state: 'ended',
      stateReason: 'count_reached',
      nextLocal: null,
    });
  });

  it('creates nothing more once stopped', async () => {
    at('2027-01-04T06:00:00Z');
    const post = await repeating('2027-01-08T09:00', { freq: 'daily' });
    const stop = await call('POST', `series/${post.seriesId}/stop`, ownerAuth);
    expect(stop.status).toBe(200);
    expect(await stop.json()).toMatchObject({ state: 'stopped', nextLocal: null });
    at('2027-01-08T08:00:00Z');
    await advance();
    expect(await occurrences(post)).toHaveLength(1);
    const audit = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_id'])
        .where('resource_id', '=', decodePublicId('series', post.seriesId ?? ''))
        .execute(),
    );
    expect(audit).toEqual([{ action: 'series.stopped', actor_id: ownerId }]);
  });

  it('pauses when its owner may no longer schedule', async () => {
    at('2027-01-04T06:00:00Z');
    const editor = await addMember('series-editor', false);
    const post = await repeating('2027-01-09T09:00', { freq: 'daily' }, editor.auth);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ role: 'viewer' })
        .where('user_id', '=', editor.id)
        .execute(),
    );
    at('2027-01-09T08:00:00Z');
    await advance();
    expect(await occurrences(post)).toHaveLength(1);
    expect(await seriesOf(post)).toMatchObject({ state: 'paused', stateReason: 'owner_lost' });
    const resume = () => call('POST', `series/${post.seriesId}/resume`, ownerAuth);
    expect(await (await resume()).json()).toMatchObject({ state: 'active', stateReason: null });
    expect((await resume()).status).toBe(200);
    await advance();
    const [, second] = await occurrences(post);
    expect(second).toMatchObject({
      created_by_user_id: ownerId,
      schedule_local: '2027-01-10 09:00:00',
    });
    await call('POST', `series/${post.seriesId}/stop`, ownerAuth);
    expect((await resume()).status).toBe(409);
    const audit = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select('action')
        .where('resource_id', '=', decodePublicId('series', post.seriesId ?? ''))
        .orderBy('occurred_at')
        .orderBy('id')
        .execute(),
    );
    expect(audit.map((a) => a.action)).toEqual([
      'series.paused',
      'series.resumed',
      'series.stopped',
    ]);
  });

  it('keeps 09:00 local time across the spring-forward change', async () => {
    at('2027-03-20T06:00:00Z');
    const auth = await login('owner');
    const post = await repeating('2027-03-22T09:00', { freq: 'weekly', byDay: ['mo'] }, auth);
    at('2027-03-22T08:00:00Z');
    await advance();
    await advance();
    const [first, second] = await occurrences(post);
    expect(first?.scheduled_at?.toISOString()).toBe('2027-03-22T08:00:00.000Z');
    expect(second).toMatchObject({ scheduled_local: '2027-03-29 09:00:00', state: 'scheduled' });
    expect(second?.scheduled_at?.toISOString()).toBe('2027-03-29T07:00:00.000Z');
    expect(internal(post.id)).toBe(first?.id);
  });
});
