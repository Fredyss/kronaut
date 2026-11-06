import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postIn } from '../../../actors/destinations/testing.ts';
import { assign, type BrandDto, newBrand } from '../../../steps/brands/testing.ts';
import { type GroupDto, join, leave, newGroup } from '../../../steps/groups/testing.ts';
import {
  accountA,
  accountB,
  call,
  create,
  doc,
  insertAccount,
  ownerAuth,
  startPosts,
  stopPosts,
} from '../testing.ts';
import type { PostDto } from './dto.ts';

let test: TestDatabase;
let accountC: string;
let team: GroupDto;
let north: BrandDto;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  accountC = await insertAccount('Account C');
  team = await newGroup('Team');
  await join(team, accountA, accountC);
  north = await newBrand('North');
  await assign(accountA, north);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function postOn(...accounts: string[]): Promise<PostDto> {
  return create(ownerAuth, {
    items: [{ doc: doc('Group filter') }],
    destinations: accounts.map((accountId) => ({ accountId, publishType: 'post' })),
  });
}

async function ids(path: string): Promise<string[]> {
  const response = await call('GET', path, ownerAuth);
  expect(response.status).toBe(200);
  const body = (await response.json()) as { items: { id?: string; postId?: string }[] };
  return body.items.map((item) => item.postId ?? item.id ?? '');
}

describe('the group filter', () => {
  it('matches posts with a destination on a current member, and combines with brand', async () => {
    const onA = await postOn(accountA);
    const onB = await postOn(accountB);
    const onC = await postOn(accountC, accountB);
    const drafts = 'posts?unscheduled=true';
    expect(await ids(`${drafts}&group=${team.id}`)).toEqual([onC.id, onA.id]);
    expect(await ids(`${drafts}&group=${team.id}&brand=${north.id}`)).toEqual([onA.id]);
    expect(await ids(`${drafts}&group=${team.id}&brand=none`)).toEqual([onC.id]);
    expect(await ids(`${drafts}&brand=none`)).toEqual([onC.id, onB.id]);
    await leave(team, accountC);
    expect(await ids(`${drafts}&group=${team.id}`)).toEqual([onA.id]);
    await join(team, accountC);
  });

  it('gives an empty list for an unknown or invalid group', async () => {
    const ghost = encodePublicId('group', '0190a0a0-0000-7000-8000-000000000000');
    for (const path of ['posts?unscheduled=true&', 'needs-action?']) {
      expect(await ids(`${path}group=grp_nope`)).toEqual([]);
      expect(await ids(`${path}group=${ghost}`)).toEqual([]);
    }
  });

  it('applies to the needs-action inbox, combined with brand', async () => {
    const onA = await postIn('failed', { accountId: accountA });
    const onC = await postIn('failed', { accountId: accountC });
    await postIn('failed', { accountId: accountB });
    expect(await ids(`needs-action?group=${team.id}`)).toEqual([onC.post.id, onA.post.id]);
    expect(await ids(`needs-action?group=${team.id}&brand=${north.id}`)).toEqual([onA.post.id]);
    expect(await ids(`needs-action?group=${team.id}&brand=none`)).toEqual([onC.post.id]);
  });
});
