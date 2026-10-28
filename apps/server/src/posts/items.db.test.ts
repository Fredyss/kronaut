import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostDto } from './dto.ts';
import {
  accountA,
  call,
  create,
  doc,
  errorOf,
  ownerAuth,
  readyMedia,
  startPosts,
  stopPosts,
} from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function chain(...texts: string[]) {
  return [
    { doc: doc(texts[0] ?? 'main') },
    ...texts.slice(1, -1).map((text) => ({ role: 'thread', doc: doc(text) })),
    { role: 'comment', doc: doc(texts.at(-1) ?? 'comment') },
  ];
}

function roles(post: PostDto) {
  return post.items.map((item) => [item.position, item.role]);
}

describe('post items', () => {
  it('creates and reads back a main post, replies and a first comment in order', async () => {
    const created = await create(ownerAuth, {
      items: chain('main', 'one', 'two', 'first'),
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    expect(roles(created)).toEqual([
      [0, 'main'],
      [1, 'thread'],
      [2, 'thread'],
      [3, 'comment'],
    ]);
    expect(created.items[2]?.doc).toEqual(doc('two'));
    const read = await call('GET', `posts/${created.id}`, ownerAuth);
    expect(((await read.json()) as PostDto).items).toEqual(created.items);
  });

  it('replaces the item list on update and keeps a single item working without roles', async () => {
    const created = await create(ownerAuth, { items: [{ doc: doc('solo') }] });
    expect(roles(created)).toEqual([[0, 'main']]);
    const response = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: created.version,
      items: [
        { role: 'main', doc: doc('main') },
        { role: 'thread', doc: doc('reply') },
      ],
    });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as PostDto;
    expect(roles(updated)).toEqual([
      [0, 'main'],
      [1, 'thread'],
    ]);
    expect(updated.items[1]?.doc).toEqual(doc('reply'));
  });

  it('accepts the item list on a variant', async () => {
    const created = await create(ownerAuth, {
      items: [{ doc: doc('default') }],
      variants: [{ items: chain('variant', 'reply', 'first') }],
      destinations: [{ accountId: accountA, publishType: 'post', variant: 0 }],
    });
    expect(created.variants[0]?.items.map((item) => item.role)).toEqual([
      'main',
      'thread',
      'comment',
    ]);
  });

  it.each([
    ['a thread comes first', [{ role: 'thread', doc: doc('x') }]],
    ['main appears twice', [{ doc: doc('x') }, { role: 'main', doc: doc('y') }]],
    [
      'a thread follows the comment',
      [{ doc: doc('x') }, { role: 'comment', doc: doc('c') }, { role: 'thread', doc: doc('t') }],
    ],
    [
      'there are two comments',
      [{ doc: doc('x') }, { role: 'comment', doc: doc('c') }, { role: 'comment', doc: doc('d') }],
    ],
  ])('answers 422 when %s', async (_label, items) => {
    const response = await call('POST', 'posts', ownerAuth, { items });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.items', code: 'invalid_item_roles' }],
    });
  });

  it('answers 422 for media on a comment and for more than 25 items', async () => {
    const media = await call('POST', 'posts', ownerAuth, {
      items: [
        { doc: doc('x') },
        { role: 'comment', doc: doc('c'), media: [{ mediaId: readyMedia }] },
      ],
    });
    expect(media.status).toBe(422);
    expect(await errorOf(media)).toMatchObject({
      details: [{ path: 'body.items.1.media', code: 'media_not_allowed' }],
    });
    const many = await call('POST', 'posts', ownerAuth, {
      items: Array.from({ length: 26 }, (_, index) => ({ doc: doc(`${index}`) })),
    });
    expect(many.status).toBeGreaterThanOrEqual(400);
    expect(many.status).toBeLessThan(500);
  });
});
