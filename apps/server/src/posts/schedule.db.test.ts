import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { publishDeps, runPublish } from '../publish/task.ts';
import { FAKE_TEXT_MAX } from '../publish/testing.ts';
import type { PostDto } from './dto.ts';
import { UNFROZEN } from './freeze.ts';
import {
  accountA,
  accountB,
  BASE,
  CLI,
  call,
  create,
  db,
  doc,
  draft,
  errorOf,
  fake,
  grantAuth,
  inMinutes,
  internal,
  jobRunAt,
  keyring,
  media,
  owner,
  ownerAuth,
  ownerId,
  providers,
  revisionsOf,
  SYSTEM,
  scheduleCall,
  scheduled,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function destinationOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .selectAll()
      .where('post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
}

describe('scheduling', () => {
  it('freezes and queues a draft at a local time', async () => {
    const local = inMinutes(120);
    const created = await create(ownerAuth, draft());
    const post = await scheduled(created, local);
    expect(post).toMatchObject({
      version: created.version + 1,
      scheduleMode: 'instant',
      scheduleTz: TZ,
      destinations: [{ state: 'scheduled', version: 2 }],
    });
    const at = Temporal.PlainDateTime.from(local).toZonedDateTime(TZ).toInstant();
    const row = await destinationOf(post);
    expect(row).toMatchObject({
      frozen_post_version: post.version,
      tz_resolution: 'exact',
      scheduled_tz: TZ,
      scheduled_by_user_id: ownerId,
    });
    expect(row.scheduled_at?.getTime()).toBe(at.epochMilliseconds);
    expect(row.run_at?.getTime()).toBe(at.epochMilliseconds);
    expect(row.deadline_at?.getTime()).toBe(at.add({ hours: 6 }).epochMilliseconds);
    expect(await revisionsOf(post)).toEqual([{ post_version: post.version, reason: 'schedule' }]);
    expect((await jobRunAt(row.id))?.getTime()).toBe(at.epochMilliseconds);
  });

  it('publishes what it froze', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const row = await destinationOf(post);
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set run_at = now() - interval '1 second' where id = ${row.id}`.execute(
        trx,
      ),
    );
    fake.script({ kind: 'publish', remoteId: 'r-schedule' });
    await runPublish(
      publishDeps({
        db,
        providers,
        keyring,
        media,
        logger: pino({ level: 'silent' }),
        workerId: 'posts-test',
        publicBaseUrl: BASE,
      }),
      { workspaceId, id: row.id },
    );
    expect(await destinationOf(post)).toMatchObject({
      state: 'published',
      remote_id: 'r-schedule',
    });
  });

  it('moves a local time in a DST gap forward', async () => {
    const post = await scheduled(await create(ownerAuth, draft()), '2027-03-28T02:30');
    expect(post.scheduleLocal).toBe('2027-03-28T03:30:00');
    expect(await destinationOf(post)).toMatchObject({
      tz_resolution: 'gap_forward',
      scheduled_local: '2027-03-28 03:30:00',
    });
  });

  it('refuses a past time and a grant without approval', async () => {
    const post = await create(ownerAuth, draft());
    const past = await scheduleCall(post, {
      mode: 'instant',
      scheduleLocal: inMinutes(-5),
      scheduleTz: TZ,
    });
    expect(past.status).toBe(422);
    expect(await errorOf(past)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.scheduleLocal', code: 'in_past' }],
    });
    const grant = await scheduleCall(post, { mode: 'asap' }, grantAuth);
    expect(grant.status).toBe(403);
    expect((await errorOf(grant)).code).toBe('approval_required');
  });

  it('refuses a draft that fails preflight and writes nothing', async () => {
    const post = await create(ownerAuth, {
      items: [{ doc: doc('x'.repeat(FAKE_TEXT_MAX + 1)) }],
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    const response = await scheduleCall(post, { mode: 'asap' });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'preflight_failed',
      details: [{ path: 'destinations.0', code: 'text_too_long' }],
    });
    expect(await destinationOf(post)).toMatchObject({ state: 'draft', version: 1 });
    expect(await revisionsOf(post)).toEqual([]);
  });

  it('freezes and preflights each destination against its own variant', async () => {
    const long = { doc: doc('x'.repeat(FAKE_TEXT_MAX + 1)) };
    const short = { doc: doc('short') };
    const post = await create(ownerAuth, {
      items: [long],
      variants: [{ items: [short] }],
      destinations: [{ accountId: accountA, publishType: 'post', variant: 0 }],
    });
    const frozen = await scheduled(post);
    const revision = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_revisions')
        .select('snapshot')
        .where('post_id', '=', internal(post.id))
        .where('post_version', '=', frozen.version)
        .executeTakeFirstOrThrow(),
    );
    const variant = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_variants')
        .select('id')
        .where('post_id', '=', internal(post.id))
        .where('is_default', '=', false)
        .executeTakeFirstOrThrow(),
    );
    expect(revision.snapshot).toMatchObject({
      destinations: [{ variantId: variant.id }],
      variants: [{ id: variant.id, isDefault: false, items: [{ doc: doc('short') }] }],
    });

    const reverse = await create(ownerAuth, {
      items: [short],
      variants: [{ items: [long] }],
      destinations: [{ accountId: accountA, publishType: 'post', variant: 0 }],
    });
    const response = await scheduleCall(reverse, { mode: 'asap' });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'preflight_failed',
      details: [{ path: 'destinations.0', code: 'text_too_long' }],
    });
  });

  it('unschedules back to an editable draft', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const { id } = await destinationOf(post);
    const response = await call('POST', `posts/${post.id}/unschedule`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(response.status).toBe(200);
    const unscheduled = (await response.json()) as PostDto;
    expect(unscheduled).toMatchObject({ scheduleMode: 'unscheduled', scheduleLocal: null });
    expect(await destinationOf(post)).toMatchObject({
      state: 'draft',
      state_reason: 'unscheduled',
      frozen_post_version: null,
      content_hash: null,
      run_at: null,
      scheduled_by_user_id: null,
    });
    expect(await jobRunAt(id)).toBeUndefined();

    const edited = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: unscheduled.version,
      title: 'again',
    });
    expect(edited.status).toBe(200);
    const again = await scheduled((await edited.json()) as PostDto);
    expect((await revisionsOf(post)).map((r) => r.post_version)).toEqual([
      post.version,
      again.version,
    ]);
  });

  it('starts a reschedule from a clean attempt', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const { id } = await destinationOf(post);
    const deps = publishDeps({
      db,
      providers,
      keyring,
      media,
      logger: pino({ level: 'silent' }),
      workerId: 'posts-test',
      publicBaseUrl: BASE,
    });
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set run_at = now() - interval '1 second' where id = ${id}`.execute(
        trx,
      ),
    );
    fake.script({ kind: 'pending', pollAfterMs: 5000, checkpoint: { container: 'old' } });
    await runPublish(deps, { workspaceId, id });
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations
             set attempt_count = 5, last_error_code = 'transient', last_error_message = 'blip'
           where id = ${id}`.execute(trx),
    );
    expect(await destinationOf(post)).toMatchObject({
      state: 'retry_wait',
      attempt_count: 5,
      provider_state: { container: 'old' },
    });

    const unschedule = await call('POST', `posts/${post.id}/unschedule`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(unschedule.status).toBe(200);
    const unscheduled = (await unschedule.json()) as PostDto;
    expect(await destinationOf(post)).toMatchObject({
      state: 'draft',
      attempt_count: 0,
      provider_state: {},
      last_error_code: null,
      last_error_message: null,
    });
    const leftover = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('destination_items')
        .select('destination_id')
        .where('destination_id', '=', id)
        .execute(),
    );
    expect(leftover).toEqual([]);

    await scheduled(unscheduled);
    expect(await destinationOf(post)).toMatchObject({
      state: 'scheduled',
      attempt_count: 0,
      provider_state: {},
    });
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set run_at = now() - interval '1 second' where id = ${id}`.execute(
        trx,
      ),
    );
    fake.script({ kind: 'publish', remoteId: 'r-fresh' });
    await runPublish(deps, { workspaceId, id });
    expect(fake.calls.at(-1)?.state).toEqual({});
    expect(await destinationOf(post)).toMatchObject({
      state: 'published',
      remote_id: 'r-fresh',
      attempt_count: 1,
    });
  });
});

function rescheduleCall(post: PostDto, scheduleLocal: string): Promise<Response> {
  return call('POST', `posts/${post.id}/reschedule`, ownerAuth, {
    expectedVersion: post.version,
    scheduleLocal,
    scheduleTz: TZ,
  });
}

async function stateOf(post: PostDto) {
  const postId = internal(post.id);
  return await owner.withActor(SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', postId)
      .executeTakeFirstOrThrow();
    const destinations = await trx
      .selectFrom('post_destinations')
      .selectAll()
      .where('post_id', '=', postId)
      .orderBy('created_at')
      .orderBy('id')
      .execute();
    const jobs = await Promise.all(destinations.map((d) => jobRunAt(d.id)));
    return { post: row, destinations, jobs };
  });
}

function twoChannels() {
  return {
    items: [{ doc: doc('Presunúť') }],
    destinations: [
      { accountId: accountA, publishType: 'post' },
      { accountId: accountB, publishType: 'post' },
    ],
  };
}

async function unscheduledSecond(post: PostDto): Promise<PostDto> {
  const [, second] = (await stateOf(post)).destinations;
  if (second === undefined) throw new Error('expected a second destination');
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('post_destinations')
      .set({ ...UNFROZEN, state: 'draft', state_reason: 'unscheduled', version: sql`version + 1` })
      .where('id', '=', second.id)
      .execute(),
  );
  await owner.withActor(CLI, (trx) =>
    sql`select graphile_worker.remove_job(${`dest:${second.id}`})`.execute(trx),
  );
  return post;
}

describe('rescheduling', () => {
  it('moves every scheduled destination and its job to the new local time', async () => {
    const post = await scheduled(await create(ownerAuth, twoChannels()));
    const local = inMinutes(120 + 24 * 60);
    const response = await rescheduleCall(post, local);
    expect(response.status).toBe(200);
    const moved = (await response.json()) as PostDto;
    const at = Temporal.PlainDateTime.from(local).toZonedDateTime(TZ).toInstant();
    expect(moved).toMatchObject({
      version: post.version + 2,
      scheduleMode: 'instant',
      scheduleLocal: Temporal.PlainDateTime.from(local).toString(),
      scheduleTz: TZ,
    });
    const after = await stateOf(post);
    expect(after.post.schedule_local).toBe(local.replace('T', ' '));
    expect(after.destinations).toHaveLength(2);
    for (const [index, row] of after.destinations.entries()) {
      expect(row).toMatchObject({ state: 'scheduled', frozen_post_version: moved.version });
      expect(row.scheduled_at?.getTime()).toBe(at.epochMilliseconds);
      expect(after.jobs[index]?.getTime()).toBe(at.epochMilliseconds);
    }
  });

  it('refuses a past time and leaves the post, its destinations and jobs as they were', async () => {
    const post = await scheduled(await create(ownerAuth, twoChannels()));
    const before = await stateOf(post);
    const response = await rescheduleCall(post, inMinutes(-5));
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.scheduleLocal', code: 'in_past' }],
    });
    const after = await stateOf(post);
    expect(after).toEqual(before);
    expect(after.jobs.every((job) => job !== undefined)).toBe(true);
  });

  it('moves only the scheduled destinations and leaves a draft one as a draft', async () => {
    const post = await unscheduledSecond(await scheduled(await create(ownerAuth, twoChannels())));
    const response = await rescheduleCall(post, inMinutes(120 + 24 * 60));
    expect(response.status).toBe(200);
    const after = await stateOf(post);
    expect(after.destinations.map((d) => d.state)).toEqual(['scheduled', 'draft']);
    expect(after.jobs[1]).toBeUndefined();
  });

  it('refuses a post with a destination that is publishing and changes nothing', async () => {
    const post = await scheduled(await create(ownerAuth, twoChannels()));
    const [, busy] = (await stateOf(post)).destinations;
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations
             set state = 'publishing', lease_until = now() + interval '2 minutes',
                 claimed_attempt_id = gen_random_uuid(), version = version + 1
           where id = ${busy?.id}`.execute(trx),
    );
    const before = await stateOf(post);
    const response = await rescheduleCall(post, inMinutes(24 * 60));
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('conflict');
    expect(await stateOf(post)).toEqual(before);
  });
});
