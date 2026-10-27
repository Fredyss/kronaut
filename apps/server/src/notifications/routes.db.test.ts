import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type Auth,
  accountA,
  accountB,
  CLI,
  call,
  create,
  createUser,
  draft,
  errorOf,
  grantAuth,
  internal,
  login,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  startPosts,
  stopPosts,
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';
import { FAKE_PROVIDER } from '../publish/testing.ts';

let test: TestDatabase;
let otherId: string;
let otherAuth: Auth;
let scopedId: string;
let scopedAuth: Auth;

const account = (publicId: string) => decodePublicId('socialAccount', publicId) ?? '';

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  otherId = await createUser('other');
  scopedId = await createUser('scoped');
  await owner.withActor(CLI, async (trx) => {
    await trx
      .insertInto('memberships')
      .values([
        { workspace_id: workspaceId, user_id: otherId, role: 'admin' },
        {
          workspace_id: workspaceId,
          user_id: scopedId,
          role: 'editor',
          resource_scope: 'restricted',
        },
      ])
      .execute();
    await trx
      .insertInto('access_scopes')
      .values({
        workspace_id: workspaceId,
        user_id: scopedId,
        social_account_id: account(accountA),
      })
      .execute();
  });
  otherAuth = await login('other');
  scopedAuth = await login('scoped');
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await owner.withActor(SYSTEM, (trx) => trx.deleteFrom('notifications').execute());
});

interface Seed {
  readonly userId?: string;
  readonly postId?: string;
  readonly accountId?: string;
}

async function notify({ userId = ownerId, postId, accountId = accountA }: Seed = {}) {
  const { id } = await owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('notifications')
      .values({
        workspace_id: workspaceId,
        user_id: userId,
        kind: 'destination.failed',
        post_id: postId === undefined ? null : internal(postId),
        payload: JSON.stringify({
          provider: FAKE_PROVIDER,
          socialAccountId: account(accountId),
          state: 'failed',
          reason: 'permanent_error',
        }),
        dedupe_key: `test.${crypto.randomUUID()}`,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return encodePublicId('notification', id);
}

interface ListBody {
  readonly items: (Record<string, unknown> & { readonly id: string })[];
  readonly unread: number;
}

async function list(query = '', auth: Auth = ownerAuth): Promise<ListBody> {
  const response = await call('GET', `notifications${query}`, auth);
  expect(response.status).toBe(200);
  return (await response.json()) as ListBody;
}

async function markRead(body: object, auth: Auth = ownerAuth): Promise<number> {
  const response = await call('POST', 'notifications/read', auth, body);
  expect(response.status).toBe(200);
  return ((await response.json()) as { unread: number }).unread;
}

describe('notifications.list', () => {
  it("returns only the caller's rows, newest first, with the live excerpt", async () => {
    const post = await create(ownerAuth, draft());
    const first = await notify({ postId: post.id });
    await notify({ userId: otherId, postId: post.id });
    const second = await notify();
    const body = await list();
    expect(body.unread).toBe(2);
    expect(body.items.map((item) => item.id)).toEqual([second, first]);
    expect(body.items[1]).toEqual({
      id: first,
      kind: 'destination.failed',
      createdAt: expect.any(String),
      readAt: null,
      postId: post.id,
      destinationId: null,
      socialAccountId: accountA,
      provider: FAKE_PROVIDER,
      reason: 'permanent_error',
      state: 'failed',
      accountLabel: 'Account A',
      accountHandle: null,
      excerpt: 'Ahoj',
    });
    expect(body.items[0]?.excerpt).toBeNull();
  });

  it('applies limit and unread=true and counts every unread row', async () => {
    const ids = [await notify(), await notify(), await notify()];
    await markRead({ ids: [ids[2]] });
    expect((await list('?limit=1')).items.map((item) => item.id)).toEqual([ids[2]]);
    const unread = await list('?unread=true');
    expect(unread.items.map((item) => item.id)).toEqual([ids[1], ids[0]]);
    expect(unread.unread).toBe(2);
    expect((await list('?limit=1&unread=true')).unread).toBe(2);

    const refused = await call('GET', 'notifications?limit=101', ownerAuth);
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details?.[0]?.path).toBe('query.limit');
  });

  it('drops the excerpt of a soft-deleted post and hides rows outside the caller scope', async () => {
    const deleted = await create(ownerAuth, draft());
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('posts')
        .set({ deleted_at: sql<Date>`now()` })
        .where('id', '=', internal(deleted.id))
        .execute(),
    );
    await notify({ postId: deleted.id });
    expect((await list()).items[0]).toMatchObject({ postId: deleted.id, excerpt: null });

    const inScope = await create(ownerAuth, draft(accountA));
    const outOfScope = await create(ownerAuth, draft(accountB));
    await notify({ userId: scopedId, postId: inScope.id });
    await notify({ userId: scopedId, postId: outOfScope.id, accountId: accountB });
    const scoped = await list('', scopedAuth);
    expect(scoped.items.map((item) => [item.postId, item.excerpt, item.accountLabel])).toEqual([
      [inScope.id, 'Ahoj', 'Account A'],
    ]);
    expect(scoped.unread).toBe(1);
  });

  it('refuses a grant', async () => {
    expect((await call('GET', 'notifications', grantAuth)).status).toBe(401);
  });
});

describe('notifications.mark_read', () => {
  it("marks the listed ids and ignores other users' ids", async () => {
    const mine = [await notify(), await notify(), await notify()];
    const theirs = await notify({ userId: otherId });
    expect(await markRead({ ids: [mine[0], theirs] })).toBe(2);
    expect(await markRead({ ids: [mine[0], theirs] })).toBe(2);
    expect((await list('', otherAuth)).unread).toBe(1);
    expect((await list()).items.find((item) => item.id === mine[0])?.readAt).toEqual(
      expect.any(String),
    );
  });

  it('marks every unread row up to an id and leaves newer ones unread', async () => {
    await notify();
    await notify();
    await notify();
    await notify({ userId: otherId });
    // uuidv7 orders only to the millisecond, so take the middle id in the database's own order.
    const [newest, middle] = (await list('?unread=true')).items.map((item) => item.id);
    expect(await markRead({ upTo: middle })).toBe(1);
    expect((await list('?unread=true')).items.map((item) => item.id)).toEqual([newest]);
    expect((await list('', otherAuth)).unread).toBe(1);
  });

  it('ignores a well-formed id that belongs to another user', async () => {
    const mine = await notify();
    // uuidv7 orders only to the millisecond; theirs must sort after mine.
    await new Promise((resolve) => setTimeout(resolve, 2));
    const theirs = await notify({ userId: otherId });
    expect(theirs).toMatch(/^ntf_/);
    expect(await markRead({ ids: [theirs] })).toBe(1);
    expect(await markRead({ upTo: theirs })).toBe(0);
    expect((await list('', otherAuth)).unread).toBe(1);
    expect((await list()).items.map((item) => item.id)).toEqual([mine]);
  });

  it('refuses a malformed body, an undecodable id and a grant', async () => {
    expect((await call('POST', 'notifications/read', ownerAuth, { ids: [] })).status).toBe(400);
    const mine = await notify();
    const refused = await call('POST', 'notifications/read', ownerAuth, { ids: [mine, 'x'] });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details).toEqual([{ path: 'body.ids.1', code: 'not_found' }]);
    const upTo = await call('POST', 'notifications/read', ownerAuth, { upTo: ownerId });
    expect((await errorOf(upTo)).details).toEqual([{ path: 'body.upTo', code: 'not_found' }]);
    expect((await list('?unread=true')).unread).toBe(1);
    expect((await call('POST', 'notifications/read', grantAuth, { upTo: mine })).status).toBe(401);
  });
});

const ALL_ON = { email: { failures: true, approvals: true, channels: true } };

async function preferences(auth: Auth = ownerAuth): Promise<unknown> {
  const response = await call('GET', 'notification-preferences', auth);
  expect(response.status).toBe(200);
  return await response.json();
}

async function setPreferences(body: object, auth: Auth = ownerAuth): Promise<unknown> {
  const response = await call('PUT', 'notification-preferences', auth, body);
  expect(response.status).toBe(200);
  return await response.json();
}

describe('notifications.preferences', () => {
  beforeEach(async () => {
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ email_muted: [] })
        .where('workspace_id', '=', workspaceId)
        .execute(),
    );
  });

  it('emails every group by default', async () => {
    expect(await preferences()).toEqual(ALL_ON);
  });

  it("round-trips a PUT and changes only the caller's own membership", async () => {
    const muted = { email: { failures: false, approvals: true, channels: false } };
    expect(await setPreferences(muted)).toEqual(muted);
    expect(await preferences()).toEqual(muted);
    expect(await preferences(otherAuth)).toEqual(ALL_ON);
    const rows = await owner.withActor(CLI, (trx) =>
      trx
        .selectFrom('memberships')
        .select(['user_id', 'role', 'can_approve', 'resource_scope', 'email_muted'])
        .where('workspace_id', '=', workspaceId)
        .where('user_id', 'in', [ownerId, otherId])
        .execute(),
    );
    expect(Object.fromEntries(rows.map(({ user_id, ...row }) => [user_id, row]))).toEqual({
      [ownerId]: {
        role: 'owner',
        can_approve: true,
        resource_scope: 'workspace',
        email_muted: ['failures', 'channels'],
      },
      [otherId]: {
        role: 'admin',
        can_approve: false,
        resource_scope: 'workspace',
        email_muted: [],
      },
    });
    expect(await setPreferences(ALL_ON)).toEqual(ALL_ON);
    expect(await preferences()).toEqual(ALL_ON);
  });

  it('refuses an incomplete, extended or mistyped body', async () => {
    const bodies = [
      { email: { failures: false, approvals: true } },
      { email: { ...ALL_ON.email, posts: false } },
      { ...ALL_ON, push: {} },
      { email: { ...ALL_ON.email, failures: 'no' } },
    ];
    for (const body of bodies) {
      expect((await call('PUT', 'notification-preferences', ownerAuth, body)).status).toBe(400);
    }
    expect(await preferences()).toEqual(ALL_ON);
  });

  it('refuses an API key', async () => {
    expect((await call('GET', 'notification-preferences', grantAuth)).status).toBe(401);
    expect((await call('PUT', 'notification-preferences', grantAuth, ALL_ON)).status).toBe(401);
  });

  it('lets a viewer read and write their own preferences', async () => {
    const muted = { email: { failures: true, approvals: false, channels: true } };
    expect(await preferences(viewerAuth)).toEqual(ALL_ON);
    expect(await setPreferences(muted, viewerAuth)).toEqual(muted);
    expect(await preferences(viewerAuth)).toEqual(muted);
    expect(await preferences()).toEqual(ALL_ON);
  });
});
