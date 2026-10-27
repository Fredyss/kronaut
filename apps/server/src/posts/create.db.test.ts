import { randomBytes, randomUUID } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE_PROVIDER } from '../publish/testing.ts';
import type { PostDto } from './dto.ts';
import {
  accountA,
  accountB,
  call,
  callWithKey,
  create,
  db,
  doc,
  draft,
  errorOf,
  grantAuth,
  internal,
  owner,
  ownerAuth,
  ownerId,
  processingMedia,
  readyMedia,
  SYSTEM,
  startPosts,
  stopPosts,
  viewerAuth,
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

async function originOf(post: PostDto): Promise<string> {
  const row = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('posts')
      .select('origin')
      .where('id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
  return row.origin;
}

async function schedule(post: PostDto): Promise<void> {
  const postId = internal(post.id);
  await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, async (trx) => {
    const dest = await trx
      .selectFrom('post_destinations')
      .select(['id', 'social_account_id', 'publish_type', 'variant_id'])
      .where('workspace_id', '=', workspaceId)
      .where('post_id', '=', postId)
      .executeTakeFirstOrThrow();
    if (dest.variant_id === null) throw new Error('destination has no variant');
    const hash = randomBytes(32);
    await trx
      .insertInto('post_revisions')
      .values({
        workspace_id: workspaceId,
        post_id: postId,
        post_version: post.version,
        snapshot: '{}',
        snapshot_v: 1,
        content_hash: hash,
        content_hash_v: 1,
        reason: 'schedule',
      })
      .execute();
    await trx
      .insertInto('revision_destinations')
      .values({
        workspace_id: workspaceId,
        post_id: postId,
        post_version: post.version,
        social_account_id: dest.social_account_id,
        publish_type: dest.publish_type,
        variant_id: dest.variant_id,
        content_hash: hash,
      })
      .execute();
    await trx
      .updateTable('post_destinations')
      .set({
        state: 'scheduled',
        version: 2,
        frozen_at: sql<Date>`now()`,
        frozen_post_version: post.version,
        content_hash: hash,
        content_hash_v: 1,
        scheduled_local: sql<string>`(now() at time zone 'Europe/Bratislava')`,
        scheduled_tz: 'Europe/Bratislava',
        scheduled_at: sql<Date>`now()`,
        run_at: sql<Date>`now() + interval '1 hour'`,
        deadline_at: sql<Date>`now() + interval '7 hours'`,
      })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', dest.id)
      .execute();
  });
}

describe('post routes', () => {
  it('stores the doc canonical and reads the post back', async () => {
    const created = await create(ownerAuth, {
      title: 'Kafe\u0301',
      items: [
        {
          doc: doc('Cafe\u0301\r\nbar'),
          media: [{ mediaId: readyMedia, altText: 'Obra\u0301zok' }],
        },
      ],
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    const response = await call('GET', `posts/${created.id}`, ownerAuth);
    expect(response.status).toBe(200);
    const post = (await response.json()) as PostDto;
    expect(post).toEqual(created);
    expect(post).toMatchObject({
      version: 1,
      title: 'Kafé',
      scheduleMode: 'unscheduled',
      publishSummary: 'draft',
      items: [
        {
          position: 0,
          role: 'main',
          doc: doc('Café\nbar'),
          media: [{ mediaId: readyMedia, position: 0, altText: 'Obrázok' }],
        },
      ],
      destinations: [
        {
          accountId: accountA,
          provider: FAKE_PROVIDER,
          publishType: 'post',
          deliveryMode: 'auto',
          settings: {},
          state: 'draft',
          version: 1,
        },
      ],
    });
    expect(await originOf(post)).toBe('ui');
  });

  it('lets a grant draft with origin api and refuses a viewer', async () => {
    const post = await create(grantAuth, draft());
    expect(await originOf(post)).toBe('api');
    const denied = await call('POST', 'posts', viewerAuth, draft());
    expect(denied.status).toBe(403);
  });

  it('answers 422 with a path for unready media and an unknown publish type', async () => {
    const media = await call('POST', 'posts', ownerAuth, {
      items: [{ doc: doc('x'), media: [{ mediaId: processingMedia }] }],
    });
    expect(media.status).toBe(422);
    expect(await errorOf(media)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.items.0.media.0.mediaId', code: 'not_ready' }],
    });
    const type = await call('POST', 'posts', ownerAuth, {
      items: [{ doc: doc('x') }],
      destinations: [{ accountId: accountA, publishType: 'story' }],
    });
    expect(type.status).toBe(422);
    expect(await errorOf(type)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.destinations.0.publishType', code: 'unsupported' }],
    });
  });

  it('checks the version and replaces the destination set', async () => {
    const created = await create(ownerAuth, draft(accountA));
    const stale = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: created.version + 1,
      title: 'stale',
    });
    expect(stale.status).toBe(409);
    expect((await errorOf(stale)).code).toBe('version_conflict');
    const response = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: created.version,
      destinations: [{ accountId: accountB, publishType: 'post' }],
    });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as PostDto;
    expect(updated.version).toBe(created.version + 1);
    expect(updated.destinations.map((d) => d.accountId)).toEqual([accountB]);
  });

  it('returns destinations in channel order, whatever order they were sent in', async () => {
    const created = await create(ownerAuth, {
      items: [{ doc: doc('order') }],
      destinations: [
        { accountId: accountB, publishType: 'post' },
        { accountId: accountA, publishType: 'post' },
      ],
    });
    expect(created.destinations.map((d) => d.accountId)).toEqual([accountA, accountB]);
  });

  it('refuses to edit a post with a destination past draft', async () => {
    const created = await create(ownerAuth, draft());
    await schedule(created);
    const response = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: created.version,
      title: 'late',
    });
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('not_editable');
  });

  it('revives a canceled frozen destination and drops one left out', async () => {
    const created = await create(ownerAuth, draft(accountA));
    await schedule(created);
    const cancel = () =>
      db.withTenant(workspaceId, { kind: 'user', id: ownerId }, (trx) =>
        trx
          .updateTable('post_destinations')
          .set({
            state: 'canceled',
            state_reason: 'user_canceled',
            version: sql<number>`version + 1`,
          })
          .where('workspace_id', '=', workspaceId)
          .where('post_id', '=', internal(created.id))
          .execute(),
      );
    await cancel();
    const revived = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: created.version,
      destinations: [
        {
          accountId: accountA,
          publishType: 'post',
          deliveryMode: 'reminder',
          settings: { extra: true },
        },
      ],
    });
    expect(revived.status).toBe(200);
    const post = (await revived.json()) as PostDto;
    expect(post.destinations).toMatchObject([
      {
        accountId: accountA,
        state: 'draft',
        deliveryMode: 'reminder',
        settings: {},
        scheduledAt: null,
      },
    ]);
    expect(post.destinations[0]?.settings).toEqual({});
    const row = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_destinations')
        .select(['frozen_post_version', 'content_hash', 'run_at'])
        .where('post_id', '=', internal(created.id))
        .executeTakeFirstOrThrow(),
    );
    expect(row).toEqual({ frozen_post_version: null, content_hash: null, run_at: null });

    await cancel();
    const dropped = await call('PATCH', `posts/${created.id}`, ownerAuth, {
      expectedVersion: post.version,
      destinations: [],
    });
    expect(dropped.status).toBe(200);
    expect(((await dropped.json()) as PostDto).destinations).toEqual([]);
  });

  it('refuses one idempotency key reused on another post', async () => {
    const first = await create(ownerAuth, draft());
    const second = await create(ownerAuth, draft());
    const body = { expectedVersion: 1, title: 'same' };
    const key = randomUUID();
    expect((await callWithKey('PATCH', `posts/${first.id}`, ownerAuth, { body, key })).status).toBe(
      200,
    );
    const reused = await callWithKey('PATCH', `posts/${second.id}`, ownerAuth, { body, key });
    expect(reused.status).toBe(409);
    expect((await errorOf(reused)).code).toBe('idempotency_key_reused');
  });
});
