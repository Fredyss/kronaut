import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requested, setPolicy } from '../approvals/testing.ts';
import { postIn } from '../destinations/testing.ts';
import type { PostDto } from './dto.ts';
import {
  type Auth,
  accountA,
  accountB,
  CLI,
  call,
  create,
  createUser,
  doc,
  draft,
  errorOf,
  internal,
  jobRunAt,
  login,
  owner,
  ownerAuth,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  viewerAuth,
  workspaceId,
} from './testing.ts';

let test: TestDatabase;
let contributorAuth: Auth;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  await setPolicy({ mode: 'none', allow_self_approval: true });
  const contributorId = await createUser('contributor');
  await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: contributorId, role: 'contributor' })
      .execute(),
  );
  contributorAuth = await login('contributor');
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function remove(post: PostDto, auth = ownerAuth) {
  return call('DELETE', `posts/${post.id}`, auth);
}

function rowsOf(post: PostDto) {
  return owner.withActor(SYSTEM, async (trx) => ({
    post: await trx
      .selectFrom('posts')
      .select(['origin', 'schedule_mode', 'deleted_at'])
      .where('id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
    destinations: await trx
      .selectFrom('post_destinations')
      .select(['id', 'state', 'state_reason'])
      .where('post_id', '=', internal(post.id))
      .execute(),
    requests: await trx
      .selectFrom('approval_requests')
      .select(['state', 'void_reason'])
      .where('post_id', '=', internal(post.id))
      .execute(),
    audits: await trx
      .selectFrom('audit_events')
      .select(['action', 'args_summary'])
      .where('post_id', '=', internal(post.id))
      .where('resource_kind', '=', 'post')
      .execute(),
  }));
}

describe('deleting a post', () => {
  it('deletes a draft, which leaves the list', async () => {
    const post = await create(ownerAuth, draft());
    const response = await remove(post);
    expect(response.status).toBe(204);
    expect((await call('GET', `posts/${post.id}`, ownerAuth)).status).toBe(404);
    const listed = await call('GET', 'posts?unscheduled=true', ownerAuth);
    const ids = ((await listed.json()) as { items: { id: string }[] }).items.map((i) => i.id);
    expect(ids).not.toContain(post.id);
    expect((await rowsOf(post)).audits).toEqual([{ action: 'post.deleted', args_summary: null }]);
    expect((await remove(post)).status).toBe(404);
  });

  it('cancels a scheduled destination, and refuses a viewer', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    expect((await remove(post, viewerAuth)).status).toBe(403);
    expect((await remove(post)).status).toBe(204);
    const { destinations } = await rowsOf(post);
    expect(destinations).toMatchObject([{ state: 'canceled', state_reason: 'user_canceled' }]);
    expect(await jobRunAt(destinations[0]?.id ?? '')).toBeUndefined();
  });

  it('refuses a role without posts:cancel while a destination is scheduled', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    expect((await remove(post, contributorAuth)).status).toBe(403);
    const rows = await rowsOf(post);
    expect(rows.post.deleted_at).toBeNull();
    expect(rows.destinations).toMatchObject([{ state: 'scheduled' }]);
    expect(await jobRunAt(rows.destinations[0]?.id ?? '')).toBeDefined();
    const plain = await create(contributorAuth, draft());
    expect((await remove(plain, contributorAuth)).status).toBe(204);
  });

  it('cancels a destination awaiting manual publishing', async () => {
    const { post } = await postIn('awaiting_manual');
    expect((await remove(post)).status).toBe(204);
    expect((await rowsOf(post)).destinations).toMatchObject([
      { state: 'canceled', state_reason: 'user_canceled' },
    ]);
  });

  it('refuses while a destination is publishing', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations
             set state = 'publishing', lease_until = now() + interval '2 minutes',
                 claimed_attempt_id = gen_random_uuid(), version = version + 1
           where post_id = ${internal(post.id)}`.execute(trx),
    );
    const response = await remove(post);
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('destination_live');
    expect((await rowsOf(post)).post.deleted_at).toBeNull();
  });

  it('voids an open approval request', async () => {
    const post = await requested(await create(ownerAuth, draft()));
    expect((await remove(post)).status).toBe(204);
    expect((await rowsOf(post)).requests).toEqual([
      { state: 'voided', void_reason: 'post_deleted' },
    ]);
  });
});

describe('duplicating a post', () => {
  it('copies every destination into an unscheduled draft', async () => {
    const source = await scheduled(
      await create(ownerAuth, {
        title: 'Launch',
        items: [{ doc: doc('Ahoj') }],
        destinations: [
          { accountId: accountA, publishType: 'post' },
          { accountId: accountB, publishType: 'post' },
        ],
      }),
    );
    const response = await call('POST', `posts/${source.id}/duplicate`, ownerAuth);
    expect(response.status).toBe(201);
    const copy = (await response.json()) as PostDto;
    expect(copy.id).not.toBe(source.id);
    expect(copy).toMatchObject({ title: 'Launch', scheduleMode: 'unscheduled', scheduleTz: null });
    expect(copy.items).toEqual(source.items);
    expect(copy.destinations.map((d) => [d.accountId, d.state])).toEqual([
      [accountA, 'draft'],
      [accountB, 'draft'],
    ]);
    const rows = await rowsOf(copy);
    expect(rows.post.origin).toBe('duplicate');
    expect(rows.audits).toEqual([
      {
        action: 'post.duplicated',
        args_summary: { source_post_id: internal(source.id), copy_post_id: internal(copy.id) },
      },
    ]);
  });

  it('does not find a deleted source', async () => {
    const post = await create(ownerAuth, draft());
    expect((await remove(post)).status).toBe(204);
    const response = await call('POST', `posts/${post.id}/duplicate`, ownerAuth);
    expect(response.status).toBe(404);
  });
});
