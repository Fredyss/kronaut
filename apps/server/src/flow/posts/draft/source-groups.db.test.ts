import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type GroupDto,
  join,
  leave,
  newGroup,
  pickedBody,
  pickedPost,
} from '../../../steps/groups/testing.ts';
import type { PostDto } from '../read/dto.ts';
import {
  accountA,
  accountB,
  call,
  errorOf,
  internal,
  owner,
  ownerAuth,
  SYSTEM,
  startPosts,
  stopPosts,
} from '../testing.ts';

let test: TestDatabase;
let group: GroupDto;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  group = await newGroup('Picked');
  await join(group, accountA);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function stored(post: PostDto) {
  const rows = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['social_account_id', 'selection_source', 'source_group_id'])
      .where('post_id', '=', internal(post.id))
      .execute(),
  );
  return new Map(
    rows.map((row) => [
      encodePublicId('socialAccount', row.social_account_id),
      [row.selection_source, row.source_group_id],
    ]),
  );
}

async function fetched(post: PostDto): Promise<PostDto> {
  const response = await call('GET', `posts/${post.id}`, ownerAuth);
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

function sources(post: PostDto) {
  return post.destinations.map((d) => [d.accountId, d.sourceGroupId]);
}

describe('sourceGroupId on destinations', () => {
  it('stores the group a member channel was picked through', async () => {
    const post = await pickedPost([accountA, group.id], [accountB, null]);
    expect(sources(post)).toEqual([
      [accountA, group.id],
      [accountB, null],
    ]);
    expect(await stored(post)).toEqual(
      new Map([
        [accountA, ['group', decodePublicId('group', group.id)]],
        [accountB, ['manual', null]],
      ]),
    );
  });

  it('refuses a channel that is not in the group', async () => {
    const response = await call('POST', 'posts', ownerAuth, pickedBody([[accountB, group.id]]));
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_in_group' },
    ]);
  });

  it('refuses an unknown group', async () => {
    const ghost = encodePublicId('group', '0190a0a0-0000-7000-8000-000000000000');
    for (const id of [ghost, 'grp_nope']) {
      const response = await call('POST', 'posts', ownerAuth, pickedBody([[accountA, id]]));
      expect(response.status).toBe(422);
      expect((await errorOf(response)).details).toEqual([
        { path: 'body.destinations.0.sourceGroupId', code: 'not_found' },
      ]);
    }
  });

  it('checks the group on update, and clears it when the field is left out', async () => {
    const post = await pickedPost([accountA, null]);
    const update = (body: object) =>
      call('PATCH', `posts/${post.id}`, ownerAuth, { expectedVersion: post.version, ...body });
    const refused = await update({
      destinations: [{ accountId: accountB, publishType: 'post', sourceGroupId: group.id }],
    });
    expect(refused.status).toBe(422);
    const picked = await update({
      destinations: [{ accountId: accountA, publishType: 'post', sourceGroupId: group.id }],
    });
    expect(picked.status).toBe(200);
    expect(sources((await picked.json()) as PostDto)).toEqual([[accountA, group.id]]);
    const again = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version + 1,
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    expect(again.status).toBe(200);
    expect(sources((await again.json()) as PostDto)).toEqual([[accountA, null]]);
    expect(await stored(post)).toEqual(new Map([[accountA, ['manual', null]]]));
  });

  it('leaves the post untouched when the channel leaves the group later', async () => {
    const other = await newGroup('Snapshot');
    await join(other, accountA, accountB);
    const post = await pickedPost([accountA, other.id], [accountB, other.id]);
    await leave(other, accountB);
    const after = await fetched(post);
    expect(after.version).toBe(post.version);
    expect(sources(after)).toEqual([
      [accountA, other.id],
      [accountB, other.id],
    ]);
  });

  it('keeps a stored pick that is sent back after the channel left the group', async () => {
    const kept = await newGroup('Kept');
    await join(kept, accountA, accountB);
    const post = await pickedPost([accountA, kept.id], [accountB, kept.id]);
    await leave(kept, accountB);
    const resent = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: pickedBody([
        [accountA, kept.id],
        [accountB, kept.id],
      ]).destinations,
    });
    expect(resent.status).toBe(200);
    expect(sources((await resent.json()) as PostDto)).toEqual([
      [accountA, kept.id],
      [accountB, kept.id],
    ]);
    const manual = await pickedPost([accountB, null]);
    const refused = await call('PATCH', `posts/${manual.id}`, ownerAuth, {
      expectedVersion: manual.version,
      destinations: pickedBody([[accountB, kept.id]]).destinations,
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details).toEqual([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_in_group' },
    ]);
  });

  it('keeps a stored pick when the channel comes back with another post type', async () => {
    const moved = await newGroup('Moved');
    await join(moved, accountA);
    const post = await pickedPost([accountA, moved.id]);
    await leave(moved, accountA);
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('post_destinations')
        .set({ publish_type: 'story' })
        .where('post_id', '=', internal(post.id))
        .execute(),
    );
    const resent = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: pickedBody([[accountA, moved.id]]).destinations,
    });
    expect(resent.status).toBe(200);
    expect(sources((await resent.json()) as PostDto)).toEqual([[accountA, moved.id]]);
  });

  it('never lets a group stored on one channel admit another channel', async () => {
    const pair = await newGroup('Pair');
    await join(pair, accountB);
    const post = await pickedPost([accountB, pair.id]);
    const refused = await call('PATCH', `posts/${post.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: pickedBody([
        [accountA, pair.id],
        [accountB, pair.id],
      ]).destinations,
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details).toEqual([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_in_group' },
    ]);
  });
});
