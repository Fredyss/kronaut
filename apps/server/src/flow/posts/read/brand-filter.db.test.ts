import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postIn } from '../../../actors/destinations/testing.ts';
import { assign, type BrandDto, newBrand } from '../../../steps/brands/testing.ts';
import {
  accountA,
  accountB,
  call,
  create,
  doc,
  insertAccount,
  ownerAuth,
  scheduled,
  startPosts,
  stopPosts,
} from '../testing.ts';
import type { PostDto } from './dto.ts';

let test: TestDatabase;
let accountC: string;
let north: BrandDto;
let south: BrandDto;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  accountC = await insertAccount('Account C');
  north = await newBrand('North');
  south = await newBrand('South');
  await assign(accountA, north);
  await assign(accountC, south);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function postOn(...accounts: string[]): Promise<PostDto> {
  return create(ownerAuth, {
    items: [{ doc: doc('Brand filter') }],
    destinations: accounts.map((accountId) => ({ accountId, publishType: 'post' })),
  });
}

async function ids(path: string): Promise<string[]> {
  const response = await call('GET', path, ownerAuth);
  expect(response.status).toBe(200);
  const body = (await response.json()) as { items: { id?: string; postId?: string }[] };
  return body.items.map((item) => item.postId ?? item.id ?? '');
}

describe('the brand filter', () => {
  it('matches drafts with a destination on a channel of the brand, or without one', async () => {
    const onNorth = await postOn(accountA);
    const unbranded = await postOn(accountB);
    const mixed = await postOn(accountA, accountC);
    const drafts = 'posts?unscheduled=true';
    expect(await ids(`${drafts}&brand=${north.id}`)).toEqual([mixed.id, onNorth.id]);
    expect(await ids(`${drafts}&brand=${south.id}`)).toEqual([mixed.id]);
    expect(await ids(`${drafts}&brand=none`)).toEqual([unbranded.id]);
    expect(await ids(`${drafts}&brand=brand_nope`)).toEqual([]);
    const ghost = encodePublicId('brand', '0190a0a0-0000-7000-8000-000000000000');
    expect(await ids(`${drafts}&brand=${ghost}`)).toEqual([]);
  });

  it('applies to the calendar range', async () => {
    const onSouth = await scheduled(await postOn(accountC));
    const onNorth = await scheduled(await postOn(accountA));
    const now = Temporal.Now.instant();
    const range = `posts?from=${now.toString()}&to=${now.add({ hours: 24 }).toString()}`;
    expect(await ids(`${range}&brand=${south.id}`)).toEqual([onSouth.id]);
    expect(await ids(`${range}&brand=${north.id}`)).toEqual([onNorth.id]);
    expect(await ids(`${range}&brand=none`)).toEqual([]);
  });

  it('applies to the needs-action inbox', async () => {
    const onNorth = await postIn('failed', { accountId: accountA });
    const unbranded = await postIn('failed', { accountId: accountB });
    expect(await ids(`needs-action?brand=${north.id}`)).toEqual([onNorth.post.id]);
    expect(await ids('needs-action?brand=none')).toEqual([unbranded.post.id]);
    expect(await ids(`needs-action?brand=${south.id}`)).toEqual([]);
    expect(await ids('needs-action?brand=brand_nope')).toEqual([]);
  });
});
