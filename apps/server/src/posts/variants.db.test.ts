import { randomBytes } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openRequestOf, requested, setPolicy } from '../approvals/testing.ts';
import type { PostDto } from './dto.ts';
import {
  accountA,
  accountB,
  call,
  create,
  db,
  doc,
  errorOf,
  insertAccount,
  internal,
  owner,
  ownerAuth,
  ownerId,
  readyMedia,
  SYSTEM,
  startPosts,
  stopPosts,
} from './testing.ts';

let test: TestDatabase;
let accountC: string;
let accountD: string;
let foreignMedia: string;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  accountC = await insertAccount('Account C');
  accountD = await insertAccount('Account D');
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
  const otherWs = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org 2', 'Other', 'ws-variants-2', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  foreignMedia = await db.withTenant(otherWs, { kind: 'user', id: ownerId }, async (trx) => {
    const { id } = await trx
      .insertInto('media_assets')
      .values({
        workspace_id: otherWs,
        kind: 'image',
        state: 'ready',
        storage_key: randomBytes(32).toString('hex'),
        sha256: randomBytes(32),
        mime: 'image/png',
        bytes: '10',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return encodePublicId('media', id);
  });
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

type Item = PostDto['items'][number];

function textOf(items: readonly Item[]): string {
  const [main] = items;
  const paragraph = (main?.doc.content as { content: { text: string }[] }[] | undefined)?.[0];
  return paragraph?.content[0]?.text ?? '';
}

function contentByAccount(post: PostDto) {
  return Object.fromEntries(
    post.destinations.map((d) => {
      const items = d.variant === null ? post.items : (post.variants[d.variant]?.items ?? []);
      return [d.accountId, { text: textOf(items), media: items[0]?.media ?? [] }];
    }),
  );
}

function firstAppearances(post: PostDto): number[] {
  const seen: number[] = [];
  for (const d of post.destinations) {
    if (d.variant !== null && !seen.includes(d.variant)) seen.push(d.variant);
  }
  return seen;
}

function variantRows(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_variants')
      .select(['id', 'is_default', 'label', 'content_language', 'forked_from_post_version'])
      .where('post_id', '=', internal(post.id))
      .orderBy('is_default', 'desc')
      .execute(),
  );
}

function patch(post: PostDto, body: object) {
  return call('PATCH', `posts/${post.id}`, ownerAuth, { expectedVersion: post.version, ...body });
}

async function patched(post: PostDto, body: object): Promise<PostDto> {
  const response = await patch(post, body);
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

const dest = (accountId: string, variant?: number) => ({
  accountId,
  publishType: 'post',
  ...(variant === undefined ? {} : { variant }),
});

function withVariants() {
  return {
    items: [{ doc: doc('Default'), media: [{ mediaId: readyMedia, altText: 'Default alt' }] }],
    variants: [
      { items: [{ doc: doc('Shared'), media: [{ mediaId: readyMedia, altText: 'Shared alt' }] }] },
      { items: [{ doc: doc('Solo') }] },
    ],
    destinations: [dest(accountA), dest(accountB, 0), dest(accountC, 1), dest(accountD, 0)],
  };
}

const withAlt = (altText: string) => [{ mediaId: readyMedia, position: 0, altText }];

function expected() {
  return {
    [accountA]: { text: 'Default', media: withAlt('Default alt') },
    [accountB]: { text: 'Shared', media: withAlt('Shared alt') },
    [accountC]: { text: 'Solo', media: [] },
    [accountD]: { text: 'Shared', media: withAlt('Shared alt') },
  };
}

describe('post variants', () => {
  it('creates variants, reads them back by first destination and round-trips', async () => {
    const created = await create(ownerAuth, withVariants());
    const response = await call('GET', `posts/${created.id}`, ownerAuth);
    const post = (await response.json()) as PostDto;
    expect(post).toEqual(created);
    expect(textOf(post.items)).toBe('Default');
    expect(post.variants).toHaveLength(2);
    expect(firstAppearances(post)).toEqual([0, 1]);
    expect(contentByAccount(post)).toEqual(expected());
    const rows = await variantRows(post);
    expect(rows.map((row) => row.is_default)).toEqual([true, false, false]);
    expect(rows[1]).toMatchObject({ label: null, content_language: null });
    expect(rows[1]?.forked_from_post_version).toBeNull();

    const { items, variants, destinations } = post;
    const again = await patched(post, { items, variants, destinations });
    expect(contentByAccount(again)).toEqual(expected());
    expect(again.items).toEqual(post.items);
    expect(await variantRows(again)).toHaveLength(3);
  });

  it('answers 422 for bad variant references, docs and media', async () => {
    const answer = async (body: object) => {
      const response = await call('POST', 'posts', ownerAuth, body);
      expect(response.status).toBe(422);
      return (await errorOf(response)).details;
    };
    const one = [{ items: [{ doc: doc('V') }] }];
    expect(
      await answer({
        items: [{ doc: doc('x') }],
        variants: one,
        destinations: [dest(accountA, 1)],
      }),
    ).toEqual([
      { path: 'body.destinations.0.variant', code: 'variant_unknown' },
      { path: 'body.variants.0', code: 'variant_unused' },
    ]);
    expect(
      await answer({
        items: [{ doc: doc('x') }],
        variants: [...one, ...one],
        destinations: [dest(accountA, 0)],
      }),
    ).toEqual([{ path: 'body.variants.1', code: 'variant_unused' }]);
    expect(
      await answer({
        items: [{ doc: doc('x') }],
        variants: [{ items: [{ doc: { type: 'paragraph' } }] }],
        destinations: [dest(accountA, 0)],
      }),
    ).toEqual([expect.objectContaining({ path: 'body.variants.0.items.0.doc' })]);
    expect(
      await answer({
        items: [{ doc: doc('x') }],
        variants: [{ items: [{ doc: doc('V'), media: [{ mediaId: foreignMedia }] }] }],
        destinations: [dest(accountA, 0)],
      }),
    ).toEqual([{ path: 'body.variants.0.items.0.media.0.mediaId', code: 'not_found' }]);
  });

  it('keeps variants on an items edit and drops them on a destinations edit', async () => {
    const created = await create(ownerAuth, withVariants());
    const edited = await patched(created, { items: [{ doc: doc('New default') }] });
    expect(edited.variants).toEqual(created.variants);
    expect(contentByAccount(edited)).toEqual({
      ...expected(),
      [accountA]: { text: 'New default', media: [] },
    });

    const lone = await patch(edited, { variants: [{ items: [{ doc: doc('V') }] }] });
    expect(lone.status).toBe(422);
    expect((await errorOf(lone)).details).toEqual([
      { path: 'body.variants', code: 'variants_need_destinations' },
    ]);

    const dropped = await patched(edited, { destinations: [dest(accountA), dest(accountB)] });
    expect(dropped.variants).toEqual([]);
    expect(dropped.destinations.map((d) => d.variant)).toEqual([null, null]);
    expect(await variantRows(dropped)).toEqual([expect.objectContaining({ is_default: true })]);
  });

  it('replaces the variants whole and deletes the old rows', async () => {
    const created = await create(ownerAuth, withVariants());
    const before = await variantRows(created);
    const replaced = await patched(created, {
      variants: [{ items: [{ doc: doc('Fresh') }] }],
      destinations: [dest(accountA, 0), dest(accountB)],
    });
    expect(contentByAccount(replaced)).toEqual({
      [accountA]: { text: 'Fresh', media: [] },
      [accountB]: { text: 'Default', media: withAlt('Default alt') },
    });
    const after = await variantRows(replaced);
    expect(after.map((row) => row.is_default)).toEqual([true, false]);
    expect(after[0]?.id).toBe(before[0]?.id);
    expect(before.map((row) => row.id)).not.toContain(after[1]?.id);
  });

  it('voids an open request as a content change whenever variants move', async () => {
    const plain = await requested(
      await create(ownerAuth, { items: [{ doc: doc('x') }], destinations: [dest(accountA)] }),
    );
    await patched(plain, {
      variants: [{ items: [{ doc: doc('V') }] }],
      destinations: [dest(accountA, 0)],
    });
    expect((await openRequestOf(plain)).voidReason).toBe('content_changed');

    const varied = await requested(await create(ownerAuth, withVariants()));
    await patched(varied, { destinations: [dest(accountA)] });
    expect((await openRequestOf(varied)).voidReason).toBe('content_changed');

    const untouched = await requested(
      await create(ownerAuth, { items: [{ doc: doc('x') }], destinations: [dest(accountA)] }),
    );
    await patched(untouched, { destinations: [dest(accountB)] });
    expect((await openRequestOf(untouched)).voidReason).toBe('destinations_changed');
  });
});
