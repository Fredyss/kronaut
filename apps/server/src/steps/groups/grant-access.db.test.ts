import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  type Auth,
  accountA,
  accountB,
  call,
  errorOf,
  grantAuth,
  insertGrant,
  internal,
  owner,
  ownerAuth,
  SYSTEM,
  startPosts,
  stopPosts,
} from '../../flow/posts/testing.ts';
import {
  type GroupDto,
  internalGroup,
  join,
  leave,
  newGroup,
  pickedBody,
  pickedPost,
} from './testing.ts';

const GHOST = encodePublicId('group', '0190a0a0-0000-7000-8000-000000000000');

let test: TestDatabase;
let group: GroupDto;
let reader: Auth;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  group = await newGroup('Gated');
  await join(group, accountA);
  reader = await insertGrant({ scopes: ['posts:read', 'posts:draft', 'groups:read'] });
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function storedGroups(post: PostDto) {
  const rows = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['social_account_id', 'source_group_id'])
      .where('post_id', '=', internal(post.id))
      .execute(),
  );
  const byAccount = new Map(rows.map((row) => [row.social_account_id, row.source_group_id]));
  return [accountA, accountB].map((id) => byAccount.get(decodePublicId('socialAccount', id) ?? ''));
}

async function readAs(auth: Auth, post: PostDto): Promise<PostDto> {
  const response = await call('GET', `posts/${post.id}`, auth);
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

function createAs(auth: Auth, picks: readonly (readonly [string, string | null])[]) {
  return call('POST', 'posts', auth, pickedBody(picks));
}

describe('group data for a grant without groups:read', () => {
  it('reads every sourceGroupId as null', async () => {
    const post = await pickedPost([accountA, group.id]);
    expect((await readAs(grantAuth, post)).destinations[0]?.sourceGroupId).toBeNull();
    expect((await readAs(reader, post)).destinations[0]?.sourceGroupId).toBe(group.id);
    expect((await readAs(ownerAuth, post)).destinations[0]?.sourceGroupId).toBe(group.id);
  });

  it('refuses the group filter with 403', async () => {
    for (const path of [
      `posts?unscheduled=true&group=${group.id}`,
      `needs-action?group=${group.id}`,
    ]) {
      const refused = await call('GET', path, grantAuth);
      expect(refused.status).toBe(403);
      expect((await errorOf(refused)).code).toBe('forbidden');
      expect((await call('GET', path, reader)).status).toBe(200);
    }
  });

  it('ignores sent picks on create, without checking them', async () => {
    for (const groupId of [group.id, GHOST, 'grp_nope']) {
      const created = await createAs(grantAuth, [
        [accountA, groupId],
        [accountB, groupId],
      ]);
      expect(created.status).toBe(201);
      expect(await storedGroups((await created.json()) as PostDto)).toEqual([null, null]);
    }
    const checked = await createAs(reader, [[accountB, group.id]]);
    expect(checked.status).toBe(422);
    expect((await errorOf(checked)).details).toEqual([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_in_group' },
    ]);
    const unknown = await createAs(reader, [[accountA, GHOST]]);
    expect((await errorOf(unknown)).details).toEqual([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_found' },
    ]);
  });

  it('keeps the stored pick on update, whatever the grant sends', async () => {
    const other = await newGroup('Gated update');
    await join(other, accountA, accountB);
    const post = await pickedPost([accountA, other.id], [accountB, null]);
    await leave(other, accountA);
    const patch = (version: number, picks: readonly (readonly [string, string | null])[]) =>
      call('PATCH', `posts/${post.id}`, grantAuth, {
        expectedVersion: version,
        destinations: pickedBody(picks).destinations,
      });
    const left = await patch(post.version, [
      [accountA, null],
      [accountB, other.id],
    ]);
    expect(left.status).toBe(200);
    expect(await storedGroups(post)).toEqual([internalGroup(other), null]);
    const garbage = await patch(post.version + 1, [
      [accountA, 'grp_nope'],
      [accountB, GHOST],
    ]);
    expect(garbage.status).toBe(200);
    expect(await storedGroups(post)).toEqual([internalGroup(other), null]);
    const omitted = await call('PATCH', `posts/${post.id}`, grantAuth, {
      expectedVersion: post.version + 2,
      destinations: [
        { accountId: accountA, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    });
    expect(omitted.status).toBe(200);
    expect(await storedGroups(post)).toEqual([internalGroup(other), null]);
    expect((await readAs(ownerAuth, post)).destinations[0]?.sourceGroupId).toBe(other.id);
  });
});
