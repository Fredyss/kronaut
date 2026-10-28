import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostDto } from './dto.ts';
import {
  accountB,
  CLI,
  create,
  db,
  draft,
  internal,
  jobRunAt,
  owner,
  ownerAuth,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  TZ,
} from './testing.ts';
import { recomputeTimes } from './tz-recompute.ts';

const OLD_TZDB = '2000a';
const logger = pino({ level: 'silent' });

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

async function resolvedByOldTzdb(id: string): Promise<void> {
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations
           set tzdb_version = ${OLD_TZDB},
               scheduled_at = scheduled_at - interval '1 hour',
               run_at = run_at - interval '1 hour',
               deadline_at = deadline_at - interval '1 hour'
         where id = ${id}`.execute(trx),
  );
  await owner.withActor(CLI, (trx) =>
    sql`update graphile_worker._private_jobs set run_at = run_at - interval '1 hour'
         where key = ${`dest:${id}`}`.execute(trx),
  );
}

async function claimedWithOldTzdb(id: string): Promise<void> {
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations
           set state = 'publishing', version = version + 1, tzdb_version = ${OLD_TZDB},
               lease_until = now() + interval '120 seconds', claimed_attempt_id = uuidv7()
         where id = ${id}`.execute(trx),
  );
}

describe('tz_recompute', () => {
  it('tzdata_update_recompute: re-derives the instants from the wall time', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const sending = await scheduled(await create(ownerAuth, draft(accountB)));
    const before = await destinationOf(post);
    await resolvedByOldTzdb(before.id);
    const busy = await destinationOf(sending);
    await claimedWithOldTzdb(busy.id);

    expect(await recomputeTimes(db, logger)).toContain('checked 1, moved 1');

    const local = Temporal.PlainDateTime.from(post.scheduleLocal ?? '');
    const at = local.toZonedDateTime(TZ).toInstant();
    const after = await destinationOf(post);
    expect(after).toMatchObject({
      state: 'scheduled',
      tz_resolution: 'exact',
      tzdb_version: process.versions.tz,
      scheduled_local: before.scheduled_local,
    });
    expect(after.scheduled_at?.getTime()).toBe(at.epochMilliseconds);
    expect(after.run_at?.getTime()).toBe(at.epochMilliseconds);
    expect(after.deadline_at?.getTime()).toBe(before.deadline_at?.getTime());
    expect((await jobRunAt(after.id))?.getTime()).toBe(at.epochMilliseconds);
    expect(await destinationOf(sending)).toMatchObject({
      state: 'publishing',
      tzdb_version: OLD_TZDB,
      scheduled_at: busy.scheduled_at,
    });

    expect(await recomputeTimes(db, logger)).toContain('checked 0, moved 0');
    expect((await destinationOf(post)).version).toBe(after.version);
  });
});
