import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../posts/dto.ts';
import {
  accountA,
  accountB,
  call,
  create,
  doc,
  draft,
  errorOf,
  grantAuth,
  inMinutes,
  ownerAuth,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
} from '../posts/testing.ts';
import type { ApprovalRequestDto } from './dto.ts';
import {
  addMember,
  decided,
  destinationsOf,
  type Member,
  openRequestOf,
  requested,
  setPolicy,
} from './testing.ts';

let test: TestDatabase;
let approver: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  approver = await addMember('approver', true);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'required', allow_self_approval: false, reschedule_tolerance_min: 30 });
});

async function fresh(post: PostDto): Promise<PostDto> {
  const response = await call('GET', `posts/${post.id}`, ownerAuth);
  return (await response.json()) as PostDto;
}

async function approved(body: object = {}): Promise<[PostDto, ApprovalRequestDto]> {
  const post = await requested(await create(ownerAuth, draft()), body);
  const request = await decided(await openRequestOf(post), 'approve', approver.auth);
  return [await fresh(post), request];
}

function at(local: string, minutes: number): string {
  return Temporal.PlainDateTime.from(local).add({ minutes }).toString();
}

function instant(post: PostDto, scheduleLocal: string) {
  return scheduleCall(post, { mode: 'instant', scheduleLocal, scheduleTz: TZ });
}

function reschedule(post: PostDto, scheduleLocal: string) {
  return call('POST', `posts/${post.id}/reschedule`, ownerAuth, {
    expectedVersion: post.version,
    scheduleLocal,
    scheduleTz: TZ,
  });
}

async function expectApprovalRequired(response: Response): Promise<void> {
  expect(response.status).toBe(403);
  expect((await errorOf(response)).code).toBe('approval_required');
}

async function expectOutside(response: Response): Promise<void> {
  expect(response.status).toBe(422);
  expect(await errorOf(response)).toMatchObject({
    code: 'unprocessable',
    details: [{ path: 'body.scheduleLocal', code: 'outside_approved_schedule' }],
  });
}

describe('scheduling under a required policy', () => {
  it('refuses a post without an approval', async () => {
    await expectApprovalRequired(
      await scheduleCall(await create(ownerAuth, draft()), { mode: 'asap' }),
    );
  });

  it('schedules an approved post and binds the destination to the request', async () => {
    const [post, request] = await approved();
    const response = await scheduleCall(post, { mode: 'asap' });
    expect(response.status).toBe(200);
    expect(await destinationsOf(post)).toEqual([
      expect.objectContaining({
        state: 'scheduled',
        approval_request_id: decodePublicId('approvalRequest', request.id),
        approval_schedule_bound: false,
        approved_scheduled_local: null,
      }),
    ]);
  });

  it('lets an API key schedule only what was approved', async () => {
    const [post] = await approved();
    const response = await scheduleCall(post, { mode: 'asap' }, grantAuth);
    expect(response.status).toBe(200);
    await expectApprovalRequired(
      await scheduleCall(await create(ownerAuth, draft()), { mode: 'asap' }, grantAuth),
    );
  });

  it('lets a later rejection overrule an earlier approval of the same content', async () => {
    const [approvedPost] = await approved();
    const again = await requested(approvedPost);
    await decided(await openRequestOf(again), 'reject', approver.auth);
    await expectApprovalRequired(await instant(await fresh(again), inMinutes(120)));
  });

  it('refuses content edited after the approval', async () => {
    const [post] = await approved();
    const edited = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      items: [{ doc: doc('Iný text') }],
    });
    expect(edited.status).toBe(200);
    await expectApprovalRequired(await scheduleCall(await fresh(post), { mode: 'asap' }));
    expect((await destinationsOf(post))[0]?.state).toBe('draft');
  });

  it('refuses a destination added after the approval', async () => {
    const [post] = await approved();
    const edited = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: [
        { accountId: accountA, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    });
    expect(edited.status).toBe(200);
    await expectApprovalRequired(await scheduleCall(await fresh(post), { mode: 'asap' }));
  });

  it('holds a bound schedule to the approved time within the tolerance', async () => {
    const shown = inMinutes(24 * 60);
    const [post] = await approved({ schedule: { scheduleLocal: shown, scheduleTz: TZ } });
    await expectOutside(await instant(post, at(shown, 31)));
    const response = await instant(post, at(shown, 20));
    expect(response.status).toBe(200);
    expect(await destinationsOf(post)).toEqual([
      expect.objectContaining({
        state: 'scheduled',
        approval_schedule_bound: true,
        approved_scheduled_local: Temporal.PlainDateTime.from(shown).toString().replace('T', ' '),
        approved_scheduled_tz: TZ,
        approved_tolerance_min: 30,
      }),
    ]);
  });

  it('refuses a bound schedule in another time zone', async () => {
    const shown = inMinutes(24 * 60);
    const [post] = await approved({ schedule: { scheduleLocal: shown, scheduleTz: TZ } });
    const response = await scheduleCall(post, {
      mode: 'instant',
      scheduleLocal: shown,
      scheduleTz: 'Europe/Prague',
    });
    await expectOutside(response);
  });

  it('schedules unbound outside the approved time once the policy no longer requires approval', async () => {
    const shown = inMinutes(24 * 60);
    const [post] = await approved({ schedule: { scheduleLocal: shown, scheduleTz: TZ } });
    await setPolicy({ mode: 'none', allow_self_approval: false, reschedule_tolerance_min: 30 });
    const response = await instant(post, at(shown, 120));
    expect(response.status).toBe(200);
    expect(await destinationsOf(post)).toEqual([
      expect.objectContaining({
        state: 'scheduled',
        approval_request_id: null,
        approval_schedule_bound: null,
      }),
    ]);
  });
});

describe('rescheduling a bound destination', () => {
  it('keeps the binding within the tolerance and refuses a time outside it', async () => {
    const shown = inMinutes(24 * 60);
    const [approvedPost, request] = await approved({
      schedule: { scheduleLocal: shown, scheduleTz: TZ },
    });
    const first = await instant(approvedPost, shown);
    expect(first.status).toBe(200);
    const post = (await first.json()) as PostDto;

    await expectOutside(await reschedule(post, at(shown, 45)));
    const moved = await reschedule(post, at(shown, -25));
    expect(moved.status).toBe(200);
    expect(await destinationsOf(post)).toEqual([
      expect.objectContaining({
        state: 'scheduled',
        approval_request_id: decodePublicId('approvalRequest', request.id),
        approval_schedule_bound: true,
      }),
    ]);
  });

  it('keeps an unbound approval across a reschedule', async () => {
    const [approvedPost, request] = await approved();
    const first = await instant(approvedPost, inMinutes(120));
    expect(first.status).toBe(200);
    const moved = await reschedule((await first.json()) as PostDto, inMinutes(48 * 60));
    expect(moved.status).toBe(200);
    expect((await destinationsOf(approvedPost))[0]?.approval_request_id).toBe(
      decodePublicId('approvalRequest', request.id),
    );
  });
});
