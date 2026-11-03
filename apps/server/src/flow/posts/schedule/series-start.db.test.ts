import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, setPolicy } from '../../../steps/approvals/testing.ts';
import type { PostDto } from '../read/dto.ts';
import {
  CLI,
  call,
  create,
  draft,
  errorOf,
  internal,
  owner,
  ownerAuth,
  requestCall,
  SYSTEM,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
} from '../testing.ts';

const now = Temporal.Instant.from('2027-01-04T06:00:00Z');
let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, pino({ level: 'silent' }), () => now);
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
  readonly state: string;
  readonly occurrences: number;
  readonly nextLocal: string | null;
  readonly dtstartLocal: string;
  readonly rule: object;
}

async function repeating(local: string, repeat: object) {
  const post = await create(ownerAuth, draft());
  const response = await scheduleCall(post, {
    mode: 'instant',
    scheduleLocal: local,
    scheduleTz: TZ,
    repeat,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

async function seriesOf(post: PostDto): Promise<SeriesDto> {
  const response = await call('GET', `series/${post.seriesId}`, ownerAuth);
  expect(response.status).toBe(200);
  return (await response.json()) as SeriesDto;
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
