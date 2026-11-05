import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  accountA,
  accountB,
  call,
  create,
  doc,
  errorOf,
  fetched,
  grantAuth,
  inMinutes,
  insertAccount,
  insertGrant,
  owner,
  ownerAuth,
  ownerId,
  requested,
  SYSTEM,
  scheduleCall,
  scheduled,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { addMember, decided, type Member, openRequestOf } from '../../steps/approvals/testing.ts';
import {
  assign,
  assignCall,
  type BrandDto,
  internalBrand,
  newBrand,
  postBrandOf,
  runDestination,
} from '../../steps/brands/testing.ts';

let test: TestDatabase;
let accountC: string;
let north: BrandDto;
let south: BrandDto;
let approver: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  accountC = await insertAccount('Account C');
  north = await newBrand('North');
  south = await newBrand('South');
  approver = await addMember('brand-approver', true);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await assign(accountA, north);
  await assign(accountB, south);
  await assign(accountC, null);
});

function postOn(...accounts: string[]): Promise<PostDto> {
  return create(ownerAuth, {
    items: [{ doc: doc('Ahoj') }],
    destinations: accounts.map((accountId) => ({ accountId, publishType: 'post' })),
  });
}

function brandAudits() {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['actor_id', 'resource_id', 'brand_id', 'args_summary'])
      .where('workspace_id', '=', workspaceId)
      .where('action', '=', 'channel.brand_updated')
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

describe('assigning a channel to a brand', () => {
  it('sets the brand, lists it and audits the move', async () => {
    const before = (await brandAudits()).length;
    await assign(accountC, south);
    const list = await call('GET', 'channels', ownerAuth);
    const items = ((await list.json()) as { items: { id: string; brandId: string | null }[] })
      .items;
    expect(items.find((item) => item.id === accountC)?.brandId).toBe(south.id);
    const audits = await brandAudits();
    expect(audits).toHaveLength(before + 1);
    expect(audits.at(-1)).toMatchObject({
      actor_id: ownerId,
      brand_id: internalBrand(south),
      args_summary: { from: null, to: south.id },
    });
  });

  it('refuses an archived brand, an unknown brand or channel, and grants', async () => {
    const old = await newBrand('Archived');
    expect((await call('PATCH', `brands/${old.id}`, ownerAuth, { archived: true })).status).toBe(
      200,
    );
    const archived = await assignCall(accountC, old.id);
    expect(archived.status).toBe(409);
    expect((await errorOf(archived)).code).toBe('brand_archived');

    const ghost = encodePublicId('brand', '0190a0a0-0000-7000-8000-000000000000');
    expect((await assignCall(accountC, ghost)).status).toBe(404);
    const noChannel = encodePublicId('socialAccount', '0190a0a0-0000-7000-8000-000000000000');
    expect((await assignCall(noChannel, north.id)).status).toBe(404);
    const byGrant = await call('PUT', `channels/${accountC}/brand`, grantAuth, {
      brandId: north.id,
    });
    expect(byGrant.status).toBe(401);
  });
});

describe('the post brand', () => {
  it('is the brand all destinations share, else null', async () => {
    expect(await postBrandOf(await postOn(accountA))).toBe(internalBrand(north));
    expect(await postBrandOf(await postOn(accountA, accountB))).toBeNull();
    expect(await postBrandOf(await postOn(accountA, accountC))).toBeNull();
    expect(await postBrandOf(await postOn(accountC))).toBeNull();
  });

  it('follows a new destination set', async () => {
    const post = await postOn(accountA, accountB);
    const response = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: [{ accountId: accountB, publishType: 'post' }],
    });
    expect(response.status).toBe(200);
    expect(await postBrandOf(post)).toBe(internalBrand(south));
  });

  it('moves with the channel for unfinished posts only', async () => {
    const draft = await postOn(accountA);
    const done = await scheduled(await postOn(accountA));
    await runDestination(done.destinations[0]?.id ?? '');
    expect((await fetched(done)).publishSummary).toBe('completed_all');

    await assign(accountA, south);
    expect(await postBrandOf(draft)).toBe(internalBrand(south));
    expect(await postBrandOf(done)).toBe(internalBrand(north));
    expect((await fetched(draft)).version).toBe(draft.version);
  });
});

describe('access scope', () => {
  it("keeps a channel-scoped grant's post visible once the post has a brand", async () => {
    const scoped = await insertGrant({
      scopes: ['posts:read', 'posts:draft', 'posts:submit', 'posts:schedule'],
      accounts: [accountA],
    });
    const post = await create(scoped, {
      items: [{ doc: doc('Scoped') }],
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    expect(await postBrandOf(post)).toBe(internalBrand(north));
    expect((await call('GET', `posts/${post.id}`, scoped)).status).toBe(200);
    const list = await call('GET', 'posts?unscheduled=true', scoped);
    const ids = ((await list.json()) as { items: { id: string }[] }).items.map((item) => item.id);
    expect(ids).toContain(post.id);

    const submitted = await requested(post, {}, scoped);
    await decided(await openRequestOf(submitted), 'approve', approver.auth);
    const response = await scheduleCall(
      await fetched(submitted),
      { mode: 'instant', scheduleLocal: inMinutes(120), scheduleTz: TZ },
      scoped,
    );
    expect(response.status).toBe(200);
  });
});
