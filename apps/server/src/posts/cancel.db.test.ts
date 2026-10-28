import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { publishDeps, runPublish } from '../publish/task.ts';
import type { PostDto } from './dto.ts';
import {
  accountA,
  accountB,
  BASE,
  call,
  create,
  db,
  doc,
  draft,
  fake,
  internal,
  jobRunAt,
  keyring,
  media,
  owner,
  ownerAuth,
  ownerId,
  providers,
  SYSTEM,
  scheduleCall,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
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

function destinationOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .selectAll()
      .where('post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
}

describe('scheduling', () => {
  it('never cancels a destination that may already be live', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const row = await destinationOf(post);
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set run_at = now() - interval '1 second' where id = ${row.id}`.execute(
        trx,
      ),
    );
    fake.script({ kind: 'fail', error: { kind: 'ambiguous' }, at: 'after_public' });
    await runPublish(
      publishDeps({
        db,
        providers,
        keyring,
        media,
        logger: pino({ level: 'silent' }),
        workerId: 'posts-test',
        publicBaseUrl: BASE,
      }),
      { workspaceId, id: row.id },
    );
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set state = 'unconfirmed', state_reason = 'ambiguous_response',
          version = version + 1 where id = ${row.id}`.execute(trx),
    );
    const response = await call('POST', `posts/${post.id}/cancel`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(response.status).toBe(409);
    expect((await destinationOf(post)).state).toBe('unconfirmed');
  });

  it('writes post.completed when a cancel settles the post', async () => {
    const text = 'Webhook-free words';
    const post = await scheduled(
      await create(ownerAuth, {
        items: [{ doc: doc(text) }],
        destinations: [
          { accountId: accountA, publishType: 'post' },
          { accountId: accountB, publishType: 'post' },
        ],
      }),
    );
    const postId = internal(post.id);
    const [live, waiting] = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_destinations')
        .select('id')
        .where('post_id', '=', postId)
        .orderBy('created_at')
        .orderBy('id')
        .execute(),
    );
    if (live === undefined || waiting === undefined) throw new Error('two destinations expected');
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set run_at = now() - interval '1 second' where id = ${live.id}`.execute(
        trx,
      ),
    );
    fake.script({ kind: 'publish', remoteId: 'r-settle' });
    await runPublish(
      publishDeps({
        db,
        providers,
        keyring,
        media,
        logger: pino({ level: 'silent' }),
        workerId: 'posts-test',
        publicBaseUrl: BASE,
      }),
      { workspaceId, id: live.id },
    );
    const response = await call('POST', `posts/${post.id}/cancel`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(response.status).toBe(200);
    const written = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select(['type', 'payload', sql<string>`payload::text`.as('text')])
        .where('subject_id', 'in', [postId, live.id, waiting.id])
        .orderBy('occurred_at')
        .execute(),
    );
    expect(written.map((row) => row.type)).toEqual(['destination.published', 'post.completed']);
    expect(written[1]?.payload).toMatchObject({
      data: {
        post_id: postId,
        summary: 'completed_all',
        published: 1,
        failed: 0,
        incomplete: 0,
        canceled: 1,
      },
    });
    for (const row of written) expect(row.text).not.toContain(text);
  });

  it('cancels a scheduled post with an audit row', async () => {
    const created = await create(ownerAuth, draft());
    const asap = await scheduleCall(created, { mode: 'asap' });
    expect(asap.status).toBe(200);
    const post = (await asap.json()) as PostDto;
    expect(post.scheduleMode).toBe('asap');
    const { id } = await destinationOf(post);
    const response = await call('POST', `posts/${post.id}/cancel`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(response.status).toBe(200);
    expect(await destinationOf(post)).toMatchObject({
      state: 'canceled',
      state_reason: 'user_canceled',
    });
    expect(await jobRunAt(id)).toBeUndefined();
    const audits = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_kind', 'actor_id', 'surface', 'error_code'])
        .where('resource_id', '=', id)
        .execute(),
    );
    expect(audits).toEqual([
      {
        action: 'destination.canceled',
        actor_kind: 'user',
        actor_id: ownerId,
        surface: 'ui',
        error_code: 'user_canceled',
      },
    ]);
  });
});
