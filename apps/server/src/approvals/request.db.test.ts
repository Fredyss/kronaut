import { decodePublicId, encodePublicId } from '@kronaut/core';
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
  inMinutes,
  insertGrant,
  ownerAuth,
  ownerId,
  revisionsOf,
  scheduleCall,
  startPosts,
  stopPosts,
  TZ,
} from '../posts/testing.ts';
import {
  addMember,
  destinationsOf,
  type Member,
  notificationsFor,
  openRequestOf,
  requestCall,
  requested,
  requestsOf,
  setPolicy,
  webhookEventsOf,
  withdrawCall,
} from './testing.ts';

let test: TestDatabase;
let approver: Member;
let editor: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  approver = await addMember('approver', true);
  editor = await addMember('editor', false);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
});

function patch(post: PostDto, body: object) {
  return call('PATCH', `posts/${post.id}`, ownerAuth, { expectedVersion: post.version, ...body });
}

describe('requesting approval', () => {
  it('freezes the drafts for review without scheduling them', async () => {
    const created = await create(ownerAuth, draft());
    const post = await requested(created, { note: 'Prosím pozri' });
    expect(post).toMatchObject({
      version: created.version + 1,
      publishSummary: 'in_review',
      scheduleMode: 'unscheduled',
      destinations: [{ state: 'draft', version: 1 }],
    });
    expect(await revisionsOf(post)).toEqual([{ post_version: post.version, reason: 'submit' }]);
    expect((await destinationsOf(post))[0]).toMatchObject({ frozen_at: null });
    expect(await requestsOf(post)).toEqual([
      expect.objectContaining({
        state: 'open',
        voidReason: null,
        note: 'Prosím pozri',
        requestedBy: { kind: 'user', id: encodePublicId('user', ownerId) },
        requiredApprovals: 1,
        postVersion: post.version,
        resolvedAt: null,
        destinations: [
          {
            destinationId: post.destinations[0]?.id,
            scheduleBound: false,
            shownLocal: null,
            shownTz: null,
            toleranceMin: null,
          },
        ],
        decisions: [],
      }),
    ]);
  });

  it('binds the schedule it was shown, within the policy tolerance', async () => {
    await setPolicy({ reschedule_tolerance_min: 15 });
    const local = inMinutes(180);
    const post = await requested(await create(ownerAuth, draft()), {
      schedule: { scheduleLocal: local, scheduleTz: TZ },
    });
    expect(post).toMatchObject({
      scheduleMode: 'instant',
      scheduleLocal: Temporal.PlainDateTime.from(local).toString(),
      scheduleTz: TZ,
      publishSummary: 'in_review',
    });
    const request = await openRequestOf(post);
    expect(request.destinations).toEqual([
      expect.objectContaining({
        scheduleBound: true,
        shownLocal: Temporal.PlainDateTime.from(local).toString(),
        shownTz: TZ,
        toleranceMin: 15,
      }),
    ]);
  });

  it('refuses a past schedule and writes nothing', async () => {
    const created = await create(ownerAuth, draft());
    const response = await requestCall(created, {
      schedule: { scheduleLocal: inMinutes(-5), scheduleTz: TZ },
    });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      details: [{ path: 'body.scheduleLocal', code: 'in_past' }],
    });
    expect(await requestsOf(created)).toEqual([]);
  });

  it('refuses a second open request and scheduling while one is open', async () => {
    const post = await requested(await create(ownerAuth, draft()));
    const again = await requestCall(post);
    expect(again.status).toBe(409);
    expect((await errorOf(again)).code).toBe('conflict');
    const schedule = await scheduleCall(post, { mode: 'asap' });
    expect(schedule.status).toBe(409);
    expect(await errorOf(schedule)).toMatchObject({
      code: 'conflict',
      message: 'The post is waiting for approval.',
    });
  });

  it('notifies the approvers and leaves out the requester unless self-approval is allowed', async () => {
    await setPolicy({ allow_self_approval: false });
    const post = await requested(await create(ownerAuth, draft()));
    const request = await openRequestOf(post);
    const forApprover = await notificationsFor(approver.id, 'post.approval_requested', post);
    expect(forApprover).toEqual([
      expect.objectContaining({
        dedupe_key: expect.stringMatching(/^post\.approval_requested\./),
        payload: expect.objectContaining({ provider: post.destinations[0]?.provider }),
      }),
    ]);
    expect(await notificationsFor(editor.id, 'post.approval_requested', post)).toEqual([]);
    expect(await notificationsFor(ownerId, 'post.approval_requested', post)).toEqual([]);
    expect(await webhookEventsOf(request)).toEqual([
      expect.objectContaining({
        type: 'post.approval_requested',
        payload: expect.objectContaining({
          data: {
            post_id: decodePublicId('post', post.id),
            approval_request_id: decodePublicId('approvalRequest', request.id),
          },
        }),
      }),
    ]);

    await setPolicy({ allow_self_approval: true });
    const self = await requested(await create(ownerAuth, draft()));
    expect(await notificationsFor(ownerId, 'post.approval_requested', self)).toHaveLength(1);
    expect(await notificationsFor(approver.id, 'post.approval_requested', self)).toHaveLength(1);
  });

  it('lets an API key with posts:submit request approval', async () => {
    const grant = await insertGrant({ scopes: ['posts:read', 'posts:draft', 'posts:submit'] });
    const post = await requested(await create(grant, draft()), {}, grant);
    expect(post.publishSummary).toBe('in_review');
    const [request] = await requestsOf(post, grant);
    expect(request?.requestedBy).toMatchObject({
      kind: 'grant',
      id: expect.stringMatching(/^grant_/),
    });
  });

  it('refuses a post with no draft destination', async () => {
    const created = await create(ownerAuth, draft());
    const post = (await (await scheduleCall(created, { mode: 'asap' })).json()) as PostDto;
    const response = await requestCall(post);
    expect(response.status).toBe(409);
  });
});

describe('withdrawing', () => {
  it('lets only the requester withdraw an open request', async () => {
    const post = await requested(await create(ownerAuth, draft()));
    const request = await openRequestOf(post);
    const stranger = await withdrawCall(request, approver.auth);
    expect(stranger.status).toBe(403);
    expect((await errorOf(stranger)).code).toBe('forbidden');

    const response = await withdrawCall(request, ownerAuth);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      state: 'withdrawn',
      resolvedAt: expect.any(String),
    });
    const [after] = await requestsOf(post);
    expect(after?.state).toBe('withdrawn');
    const get = await call('GET', `posts/${post.id}`, ownerAuth);
    expect(((await get.json()) as PostDto).publishSummary).toBe('draft');

    const twice = await withdrawCall(request, ownerAuth);
    expect(twice.status).toBe(409);
    expect(await webhookEventsOf(request)).toHaveLength(1);
  });
});

describe('editing under review', () => {
  it('voids the open request with the first reason that applies', async () => {
    const content = await requested(await create(ownerAuth, draft()));
    const edited = await patch(content, {
      items: [{ doc: doc('Nové') }],
      destinations: [{ accountId: accountB, publishType: 'post' }],
    });
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as PostDto).publishSummary).toBe('draft');
    expect(await openRequestOf(content)).toMatchObject({
      state: 'voided',
      voidReason: 'content_changed',
      resolvedAt: expect.any(String),
    });

    const destinations = await requested(await create(ownerAuth, draft()));
    const swapped = await patch(destinations, {
      destinations: [{ accountId: accountB, publishType: 'post' }],
    });
    expect(swapped.status).toBe(200);
    expect((await openRequestOf(destinations)).voidReason).toBe('destinations_changed');
  });

  it('keeps the request open on a title-only edit', async () => {
    const post = await requested(await create(ownerAuth, draft(accountA)));
    const response = await patch(post, { title: 'Nový titulok' });
    expect(response.status).toBe(200);
    expect((await openRequestOf(post)).state).toBe('open');
  });
});
