import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  accountA,
  accountB,
  call,
  create,
  db,
  doc,
  errorOf,
  fetched,
  insertAccount,
  ownerAuth,
  requested,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { assign, type BrandDto, newBrand, runDestination } from '../brands/testing.ts';
import {
  addMember,
  decideCall,
  decided,
  type Member,
  openRequestOf,
  setPolicy,
} from './testing.ts';

let test: TestDatabase;
let accountC: string;
let strict: BrandDto;
let loose: BrandDto;
let first: Member;
let second: Member;

const OVERRIDE = {
  mode: 'required',
  requiredApprovals: 2,
  allowSelfApproval: false,
  rescheduleToleranceMin: 0,
};

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  accountC = await insertAccount('Account C');
  strict = await newBrand('Strict');
  loose = await newBrand('Loose');
  first = await addMember('mixed-first', true);
  second = await addMember('mixed-second', true);
  await assign(accountA, strict);
  await assign(accountB, loose);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({
    mode: 'none',
    required_approvals: 1,
    allow_self_approval: true,
    reschedule_tolerance_min: 0,
  });
  await assign(accountC, null);
  await call('DELETE', `approval-policy/brands/${strict.id}`, ownerAuth);
});

async function override(values: object = {}): Promise<void> {
  const path = `approval-policy/brands/${strict.id}`;
  expect((await call('PUT', path, ownerAuth, { ...OVERRIDE, ...values })).status).toBe(200);
}

function mixed(): Promise<PostDto> {
  return create(ownerAuth, {
    items: [{ doc: doc('Mixed') }],
    destinations: [
      { accountId: accountA, publishType: 'post' },
      { accountId: accountB, publishType: 'post' },
    ],
  });
}

function approveDirectly(member: Member, requestId: string) {
  return db.withTenant(workspaceId, { kind: 'user', id: member.id }, (trx) =>
    trx
      .updateTable('approval_requests')
      .set({ state: 'approved' })
      .where('id', '=', decodePublicId('approvalRequest', requestId) ?? '')
      .execute(),
  );
}

describe('a post across brands', () => {
  it("needs the strictest brand's approval count", async () => {
    await override();
    const request = await openRequestOf(await requested(await mixed()));
    expect(request.requiredApprovals).toBe(2);
    expect(await decided(request, 'approve', first.auth)).toMatchObject({ state: 'open' });
    expect(await decided(request, 'approve', second.auth)).toMatchObject({ state: 'approved' });
  });

  it('keeps the live floor in the trigger for a request snapshotted with one approval', async () => {
    const request = await openRequestOf(await requested(await mixed()));
    expect(request.requiredApprovals).toBe(1);
    await override();
    expect(await decided(request, 'approve', first.auth)).toMatchObject({ state: 'open' });
    await expect(approveDirectly(first, request.id)).rejects.toMatchObject({ code: 'KR004' });
  });

  it('refuses self-approval when one brand disallows it', async () => {
    await override({ requiredApprovals: 1 });
    const denied = await openRequestOf(await requested(await mixed()));
    const response = await decideCall(denied, 'approve', ownerAuth);
    expect(response.status).toBe(403);
    expect((await errorOf(response)).message).toBe('You cannot decide your own approval request.');

    const single = await create(ownerAuth, {
      items: [{ doc: doc('Loose only') }],
      destinations: [{ accountId: accountB, publishType: 'post' }],
    });
    const allowed = await openRequestOf(await requested(single));
    expect(await decided(allowed, 'approve', ownerAuth)).toMatchObject({ state: 'approved' });
  });

  it('blocks an exempt destination at claim once its channel moves to a stricter brand', async () => {
    const post = await scheduled(
      await create(ownerAuth, {
        items: [{ doc: doc('Exempt') }],
        destinations: [{ accountId: accountC, publishType: 'post' }],
      }),
    );
    await override();
    await assign(accountC, strict);
    await runDestination(post.destinations[0]?.id ?? '');
    expect((await fetched(post)).destinations[0]).toMatchObject({
      state: 'blocked',
      stateReason: 'policy_denied',
    });
  });
});
