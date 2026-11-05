import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountA,
  accountB,
  call,
  errorOf,
  grantAuth,
  insertGrant,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { addMember } from '../approvals/testing.ts';
import { assign, type BrandDto, internalBrand, newBrand } from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function listed(auth = ownerAuth): Promise<BrandDto[]> {
  const response = await call('GET', 'brands', auth);
  expect(response.status).toBe(200);
  return ((await response.json()) as { items: BrandDto[] }).items;
}

function patch(brand: BrandDto, body: object) {
  return call('PATCH', `brands/${brand.id}`, ownerAuth, body);
}

function brandAudits(brand: BrandDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'actor_id', 'resource_id', 'brand_id', 'args_summary'])
      .where('workspace_id', '=', workspaceId)
      .where('resource_kind', '=', 'brand')
      .where('resource_id', '=', internalBrand(brand))
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

describe('brands', () => {
  it('creates a brand with a normalized name and a folded slug', async () => {
    const brand = await newBrand('  Kávìčka  ');
    expect(brand).toEqual({
      id: expect.stringMatching(/^brand_/),
      name: 'Kávìčka'.normalize('NFC'),
      slug: 'kavicka',
      archivedAt: null,
      channelCount: 0,
    });
    const [created] = await brandAudits(brand);
    expect(created).toMatchObject({
      action: 'brand.created',
      actor_id: ownerId,
      brand_id: internalBrand(brand),
      args_summary: { slug: 'kavicka' },
    });
  });

  it('adds a suffix when the slug is taken', async () => {
    const first = await newBrand('Acme!');
    const second = await newBrand('Acme?');
    const third = await newBrand('ACME.');
    expect([first.slug, second.slug, third.slug]).toEqual(['acme', 'acme-2', 'acme-3']);
  });

  it('refuses a name taken in any case, archived brands included', async () => {
    const old = await newBrand('Northwind');
    expect((await patch(old, { archived: true })).status).toBe(200);
    for (const name of ['Northwind', 'NORTHWIND']) {
      const taken = await call('POST', 'brands', ownerAuth, { name });
      expect(taken.status).toBe(409);
      expect((await errorOf(taken)).code).toBe('brand_name_taken');
    }
    const other = await newBrand('Southwind');
    const renamed = await patch(other, { name: 'northwind' });
    expect(renamed.status).toBe(409);
    expect((await errorOf(renamed)).code).toBe('brand_name_taken');
  });

  it.each([
    ['empty', '   '],
    ['too long', 'x'.repeat(121)],
  ])('refuses a name that is %s', async (_label, name) => {
    const response = await call('POST', 'brands', ownerAuth, { name });
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.name', code: 'name_invalid' },
    ]);
  });

  it('renames without touching the slug, and audits it', async () => {
    const brand = await newBrand('Contoso');
    const response = await patch(brand, { name: 'Contoso Group' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: 'Contoso Group', slug: 'contoso' });
    expect((await brandAudits(brand)).map((a) => [a.action, a.args_summary])).toEqual([
      ['brand.created', { slug: 'contoso' }],
      ['brand.updated', { renamed: true, archived: false }],
    ]);
  });

  it('refuses to archive a brand while a connected channel uses it', async () => {
    const brand = await newBrand('Fabrikam');
    await assign(accountA, brand);
    const refused = await patch(brand, { archived: true });
    expect(refused.status).toBe(409);
    expect((await errorOf(refused)).code).toBe('brand_in_use');

    await assign(accountA, null);
    const archived = await patch(brand, { archived: true });
    expect(archived.status).toBe(200);
    expect(((await archived.json()) as BrandDto).archivedAt).toEqual(expect.any(String));
    const restored = await patch(brand, { archived: false });
    expect(((await restored.json()) as BrandDto).archivedAt).toBeNull();
  });

  it('lists brands by name with their channel counts', async () => {
    const brand = await newBrand('aaa first');
    await assign(accountB, brand);
    const items = await listed();
    expect(items[0]).toMatchObject({ name: 'aaa first', channelCount: 1 });
    expect(items.find((item) => item.name === 'Fabrikam')?.channelCount).toBe(0);
  });

  it('lets a grant with brands:read list them, in its scope only', async () => {
    const reader = await insertGrant({ scopes: ['brands:read'] });
    expect((await listed(reader)).length).toBe((await listed()).length);
    const scoped = await insertGrant({ scopes: ['brands:read'], accounts: [accountB] });
    expect((await listed(scoped)).map((item) => item.name)).toEqual(['aaa first']);
    expect((await call('GET', 'brands', grantAuth)).status).toBe(403);
  });

  it('refuses grants and members without brands:write', async () => {
    const editor = await addMember('brand-editor', false);
    const [brand] = await listed();
    const writes = [
      ['POST', 'brands', { name: 'Grant brand' }],
      ['PATCH', `brands/${brand?.id}`, { name: 'Grant rename' }],
    ] as const;
    for (const [method, path, body] of writes) {
      expect((await call(method, path, grantAuth, body)).status).toBe(401);
      expect((await call(method, path, editor.auth, body)).status).toBe(403);
    }
  });
});
