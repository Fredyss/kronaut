import { randomUUID } from 'node:crypto';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostDto } from './dto.ts';
import {
  accountA,
  accountB,
  app,
  BASE,
  CLI,
  call,
  create,
  createUser,
  db,
  doc,
  draft,
  errorOf,
  insertAccount,
  internal,
  login,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  startPosts,
  stopPosts,
  TZ,
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

interface ListResponse {
  readonly items: (Record<string, unknown> & {
    readonly id: string;
    readonly excerpt: string;
    readonly destinations: Record<string, unknown>[];
  })[];
  readonly truncated: boolean;
}

async function placeAt(ws: string, destinationId: string, at: string): Promise<void> {
  const id = decodePublicId('destination', destinationId);
  if (id === null) throw new Error(`not a destination id: ${destinationId}`);
  const zoned = Temporal.Instant.from(at).toZonedDateTimeISO(TZ);
  await db.withTenant(ws, { kind: 'user', id: ownerId }, (trx) =>
    trx
      .updateTable('post_destinations')
      .set({
        scheduled_local: zoned.toPlainDateTime().toString(),
        scheduled_tz: TZ,
        scheduled_at: new Date(zoned.epochMilliseconds),
      })
      .where('workspace_id', '=', ws)
      .where('id', '=', id)
      .execute(),
  );
}

async function list(query: string): Promise<Response> {
  return await call('GET', `posts?${query}`, ownerAuth);
}

describe('posts.list', () => {
  it('lists the posts with a destination in range, with every destination', async () => {
    const shown = await create(ownerAuth, {
      items: [{ doc: doc('V kalendári') }],
      destinations: [
        { accountId: accountA, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    });
    const [inside, outside] = shown.destinations;
    await placeAt(workspaceId, inside?.id ?? '', '2031-03-03T09:00:00Z');
    await placeAt(workspaceId, outside?.id ?? '', '2031-04-01T09:00:00Z');
    const later = await create(ownerAuth, draft());
    await placeAt(workspaceId, later.destinations[0]?.id ?? '', '2031-03-09T00:00:00+01:00');
    const deleted = await create(ownerAuth, draft());
    await placeAt(workspaceId, deleted.destinations[0]?.id ?? '', '2031-03-04T09:00:00Z');
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('posts')
        .set({ deleted_at: sql<Date>`now()` })
        .where('id', '=', internal(deleted.id))
        .execute(),
    );
    const otherWs = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
      const result = await sql<{ workspace_id: string }>`
        select workspace_id from provision_organization('Org 2', 'Other', 'ws-posts-2', 'Europe/Bratislava')
      `.execute(trx);
      return result.rows[0]?.workspace_id ?? '';
    });
    const otherAccount = await insertAccount('Other account', otherWs);
    const response = await app.request(
      `${BASE}/v1/workspaces/${encodePublicId('workspace', otherWs)}/posts`,
      {
        method: 'POST',
        headers: {
          ...('cookie' in ownerAuth ? { cookie: ownerAuth.cookie } : {}),
          origin: BASE,
          'content-type': 'application/json',
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify(draft(otherAccount)),
      },
    );
    const foreign = (await response.json()) as PostDto;
    await placeAt(otherWs, foreign.destinations[0]?.id ?? '', '2031-03-03T10:00:00Z');

    const listed = await list('from=2031-03-02T00:00:00%2B01:00&to=2031-03-09T00:00:00%2B01:00');
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as ListResponse;
    expect(body.truncated).toBe(false);
    expect(body.items.map((item) => item.id)).toEqual([shown.id]);
    const [item] = body.items;
    expect(Object.keys(item ?? {}).sort()).toEqual([
      'destinations',
      'excerpt',
      'id',
      'mediaCount',
      'publishSummary',
      'scheduleLocal',
      'scheduleMode',
      'scheduleTz',
      'tags',
      'title',
      'updatedAt',
      'version',
    ]);
    expect(item).toMatchObject({ excerpt: 'V kalendári', mediaCount: 0 });
    expect(new Map(item?.destinations.map((d) => [d.id, d.scheduledAt]))).toEqual(
      new Map([
        [inside?.id, '2031-03-03T09:00:00.000Z'],
        [outside?.id, '2031-04-01T09:00:00.000Z'],
      ]),
    );
    expect(Object.keys(item?.destinations[0] ?? {}).sort()).toEqual([
      'accountId',
      'id',
      'lastErrorCode',
      'provider',
      'publishType',
      'publishedAt',
      'remoteUrl',
      'scheduledAt',
      'state',
    ]);
  });

  it('lists unscheduled drafts and refuses a range over 42 days', async () => {
    const scheduledPost = await create(ownerAuth, draft());
    await placeAt(workspaceId, scheduledPost.destinations[0]?.id ?? '', '2031-05-01T09:00:00Z');
    const drafted = await create(ownerAuth, draft());
    const listed = await list('unscheduled=true');
    expect(listed.status).toBe(200);
    const ids = ((await listed.json()) as ListResponse).items.map((item) => item.id);
    expect(ids[0]).toBe(drafted.id);
    expect(ids).not.toContain(scheduledPost.id);

    const tooLarge = await list('from=2031-03-01T00:00:00Z&to=2031-04-13T00:00:00Z');
    expect(tooLarge.status).toBe(422);
    expect((await errorOf(tooLarge)).details).toEqual([
      { path: 'query.to', code: 'range_too_large' },
    ]);
  });

  it('cuts the excerpt at 140 graphemes and normalises it to NFC', async () => {
    const created = await create(ownerAuth, {
      items: [
        {
          doc: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: `č${'x'.repeat(100)}` }] },
              { type: 'paragraph', content: [{ type: 'text', text: 'y'.repeat(50) }] },
            ],
          },
        },
      ],
    });
    const listed = (await (await list('unscheduled=true')).json()) as ListResponse;
    const excerpt = listed.items.find((item) => item.id === created.id)?.excerpt;
    expect(excerpt).toBe(`č${'x'.repeat(100)} ${'y'.repeat(38)}…`);
  });

  it('lists only the posts whose every channel is in a restricted member scope', async () => {
    const onlyA = await create(ownerAuth, draft(accountA));
    await placeAt(workspaceId, onlyA.destinations[0]?.id ?? '', '2032-01-05T09:00:00Z');
    const onlyB = await create(ownerAuth, draft(accountB));
    await placeAt(workspaceId, onlyB.destinations[0]?.id ?? '', '2032-01-05T10:00:00Z');
    const both = await create(ownerAuth, {
      items: [{ doc: doc('Oba kanály') }],
      destinations: [
        { accountId: accountA, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    });
    await placeAt(workspaceId, both.destinations[0]?.id ?? '', '2032-01-05T11:00:00Z');
    const scopedId = await createUser('scoped');
    await owner.withActor(CLI, async (trx) => {
      await trx
        .insertInto('memberships')
        .values({
          workspace_id: workspaceId,
          user_id: scopedId,
          role: 'viewer',
          resource_scope: 'restricted',
        })
        .execute();
      await trx
        .insertInto('access_scopes')
        .values({
          workspace_id: workspaceId,
          user_id: scopedId,
          social_account_id: decodePublicId('socialAccount', accountA) ?? '',
        })
        .execute();
    });

    const response = await call(
      'GET',
      'posts?from=2032-01-01T00:00:00Z&to=2032-01-10T00:00:00Z',
      await login('scoped'),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as ListResponse;
    expect(body.items.map((item) => item.id)).toEqual([onlyA.id]);
  });
});
