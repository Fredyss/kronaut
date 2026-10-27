import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Auth,
  accountA,
  accountB,
  call,
  create,
  db,
  draft,
  errorOf,
  insertGrant,
  internal,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
} from '../posts/testing.ts';
import { attentionQuery } from './needs-action.ts';
import { internalDestination, moveTo, type Needed, postIn } from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

interface NeedsActionResponse {
  readonly items: (Record<string, unknown> & { readonly destinationId: string })[];
  readonly total: number;
  readonly truncated: boolean;
}

async function needsAction(query = '', auth: Auth = ownerAuth): Promise<NeedsActionResponse> {
  const response = await call('GET', `needs-action${query}`, auth);
  expect(response.status).toBe(200);
  return (await response.json()) as NeedsActionResponse;
}

async function clearInbox(): Promise<void> {
  await owner.withActor(SYSTEM, (trx) =>
    trx.updateTable('posts').set({ deleted_at: sql<Date>`now()` }).execute(),
  );
}

describe('destinations.needs_action', () => {
  it('lists exactly the four needs-action states, newest first', async () => {
    await clearInbox();
    const states: Needed[] = ['failed', 'blocked', 'unconfirmed', 'awaiting_manual', 'published'];
    const made = [];
    for (const state of states) made.push(await postIn(state, { text: `Stav ${state}` }));
    await scheduled(await create(ownerAuth, draft()));
    await create(ownerAuth, draft());

    const body = await needsAction();
    expect(body.total).toBe(4);
    expect(body.truncated).toBe(false);
    expect(body.items.map((item) => item.state)).toEqual([
      'awaiting_manual',
      'unconfirmed',
      'blocked',
      'failed',
    ]);
    const unconfirmed = made[2];
    expect(body.items[1]).toEqual({
      destinationId: unconfirmed?.publicId,
      version: unconfirmed?.version,
      state: 'unconfirmed',
      reason: 'ambiguous_response',
      postId: unconfirmed?.post.id,
      postVersion: unconfirmed?.post.version,
      excerpt: 'Stav unconfirmed',
      accountId: accountA,
      provider: unconfirmed?.post.destinations[0]?.provider,
      accountLabel: 'Account A',
      accountHandle: null,
      publishType: 'post',
      deliveryMode: 'auto',
      scheduledAt: unconfirmed?.post.destinations[0]?.scheduledAt,
      remoteUrl: null,
      updatedAt: expect.any(String),
    });
  });

  it('respects the limit and reports the total', async () => {
    await clearInbox();
    for (let i = 0; i < 3; i += 1) await postIn('failed');
    const body = await needsAction('?limit=2');
    expect(body.items).toHaveLength(2);
    expect(body).toMatchObject({ total: 3, truncated: true });

    const refused = await call('GET', 'needs-action?limit=201', ownerAuth);
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details?.[0]?.path).toBe('query.limit');
  });

  it('hides posts outside a grant scope and soft-deleted posts', async () => {
    await clearInbox();
    const onlyA = await postIn('failed', { accountId: accountA });
    const onlyB = await postIn('failed', { accountId: accountB });
    const deleted = await postIn('failed', { accountId: accountA });
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('posts')
        .set({ deleted_at: sql<Date>`now()` })
        .where('id', '=', internal(deleted.post.id))
        .execute(),
    );
    const scoped = await insertGrant({ scopes: ['posts:read'], accounts: [accountA] });
    const visible = await needsAction('', scoped);
    expect(visible.items.map((item) => item.destinationId)).toEqual([onlyA.publicId]);
    expect(visible.total).toBe(1);

    const all = await needsAction();
    expect(all.items.map((item) => item.destinationId)).toEqual([onlyB.publicId, onlyA.publicId]);
  });

  it('reads the needs-action partial index', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    await moveTo(await internalDestination(post), 'failed');
    for (let i = 0; i < 20; i += 1) await scheduled(await create(ownerAuth, draft()));
    await owner.withActor(SYSTEM, (trx) => sql`analyze posts, post_destinations`.execute(trx));
    const plan = await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, async (trx) => {
      // A few test rows make any plan cheap; this checks that the filter can use the partial index at all.
      await sql`set local enable_seqscan = off`.execute(trx);
      await sql`set local enable_nestloop = off`.execute(trx);
      const rows = await attentionQuery(trx, workspaceId, null)
        .select('d.id')
        .explain<{ 'QUERY PLAN': string }>();
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    });
    expect(plan).toContain('ix_dest_attention');
  });
});
