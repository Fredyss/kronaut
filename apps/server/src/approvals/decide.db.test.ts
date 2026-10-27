import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../posts/dto.ts';
import {
  call,
  create,
  draft,
  errorOf,
  insertGrant,
  ownerAuth,
  ownerId,
  startPosts,
  stopPosts,
} from '../posts/testing.ts';
import type { ApprovalRequestDto } from './dto.ts';
import {
  addMember,
  decideCall,
  decided,
  type Member,
  notificationsFor,
  openRequestOf,
  type PolicyChange,
  reauthenticatedHoursAgo,
  requested,
  setPolicy,
  webhookEventsOf,
} from './testing.ts';

let test: TestDatabase;
let first: Member;
let second: Member;
let editor: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  first = await addMember('first', true);
  second = await addMember('second', true);
  editor = await addMember('editor', false);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'required', required_approvals: 1, allow_self_approval: false });
});

async function opened(policy: PolicyChange = {}): Promise<[PostDto, ApprovalRequestDto]> {
  await setPolicy(policy);
  const post = await requested(await create(ownerAuth, draft()));
  return [post, await openRequestOf(post)];
}

async function summaryOf(post: PostDto): Promise<string> {
  const response = await call('GET', `posts/${post.id}`, ownerAuth);
  return ((await response.json()) as PostDto).publishSummary;
}

describe('deciding', () => {
  it('approves with one approval and tells the requester', async () => {
    const [post, request] = await opened();
    const result = await decided(request, 'approve', first.auth);
    expect(result).toMatchObject({
      state: 'approved',
      resolvedAt: expect.any(String),
      decisions: [{ decision: 'approve', userId: encodePublicId('user', first.id) }],
    });
    expect(await summaryOf(post)).toBe('draft');
    expect(await notificationsFor(ownerId, 'post.approved', post)).toHaveLength(1);
    expect((await webhookEventsOf(request)).map((e) => e.type)).toEqual([
      'post.approval_requested',
      'post.approved',
    ]);
  });

  it('stays open until the required approvals are in', async () => {
    const [, request] = await opened({ required_approvals: 2 });
    expect(await decided(request, 'approve', first.auth)).toMatchObject({
      state: 'open',
      requiredApprovals: 2,
    });
    expect(await decided(request, 'approve', second.auth)).toMatchObject({ state: 'approved' });
  });

  it('rejects on reject and on request_changes', async () => {
    for (const decision of ['reject', 'request_changes']) {
      const [post, request] = await opened();
      const result = await decided(request, decision, first.auth);
      expect(result).toMatchObject({ state: 'rejected', decisions: [{ decision }] });
      expect(await notificationsFor(ownerId, 'post.rejected', post)).toHaveLength(1);
      expect(await summaryOf(post)).toBe('draft');
    }
  });

  it('refuses the requester unless self-approval is allowed', async () => {
    const [, denied] = await opened();
    const response = await decideCall(denied, 'approve', ownerAuth);
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toMatchObject({
      code: 'forbidden',
      message: 'You cannot decide your own approval request.',
    });

    const [, allowed] = await opened({ allow_self_approval: true });
    expect(await decided(allowed, 'approve', ownerAuth)).toMatchObject({ state: 'approved' });
  });

  it("treats a key's sponsor as the requester of the key's request", async () => {
    const grant = await insertGrant({ scopes: ['posts:read', 'posts:draft', 'posts:submit'] });
    const post = await requested(await create(grant, draft()), {}, grant);
    const response = await decideCall(await openRequestOf(post), 'approve', ownerAuth);
    expect(response.status).toBe(403);
    expect((await errorOf(response)).message).toBe('You cannot decide your own approval request.');
  });

  it('refuses a member who cannot approve and a stale session', async () => {
    const [post, request] = await opened();
    const response = await decideCall(request, 'approve', editor.auth);
    expect(response.status).toBe(403);
    expect((await errorOf(response)).message).toBe('You are not allowed to decide approvals.');

    const stale = await addMember('stale', true);
    await reauthenticatedHoursAgo(stale.id, 13);
    const old = await decideCall(request, 'approve', stale.auth);
    expect(old.status).toBe(403);
    expect(await errorOf(old)).toMatchObject({
      message: expect.stringMatching(/^Reauthentication required/),
      details: [{ path: 'authorization', code: 'reauth_required' }],
    });
    expect((await openRequestOf(post)).decisions).toEqual([]);
  });

  it('refuses a decision on a closed request and a second one by the same user', async () => {
    const [, closed] = await opened();
    await decided(closed, 'reject', first.auth);
    const late = await decideCall(closed, 'approve', second.auth);
    expect(late.status).toBe(409);
    expect((await errorOf(late)).code).toBe('conflict');

    const [, pending] = await opened({ required_approvals: 2 });
    await decided(pending, 'approve', first.auth);
    const twice = await decideCall(pending, 'reject', first.auth);
    expect(twice.status).toBe(409);
    expect((await errorOf(twice)).code).toBe('conflict');
  });
});
