import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { type RawBuilder, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flagAccount } from '../publish/incidents.ts';
import {
  CLI,
  createUser,
  db,
  fake,
  fixture,
  owner,
  publish,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  workspaceId,
} from '../publish/testing/harness.ts';
import { FAKE_PROVIDER, type Seeded } from '../publish/testing.ts';
import { auditTransition } from '../publish/transition.ts';

let test: TestDatabase;
let ownerId: string;
let creatorId: string;
let adminId: string;

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-notify');
  ownerId = fixture.ownerUserId;
  creatorId = await createUser('creator');
  adminId = await createUser('admin');
  const restrictedId = await createUser('restricted-admin');
  const viewerId = await createUser('viewer');
  await owner.withActor(CLI, async (trx) => {
    await trx
      .insertInto('memberships')
      .values([
        { workspace_id: workspaceId, user_id: creatorId, role: 'editor' },
        { workspace_id: workspaceId, user_id: adminId, role: 'admin' },
        {
          workspace_id: workspaceId,
          user_id: restrictedId,
          role: 'admin',
          resource_scope: 'restricted',
        },
        { workspace_id: workspaceId, user_id: viewerId, role: 'viewer' },
      ])
      .execute();
    await trx
      .insertInto('access_grants')
      .values({
        workspace_id: workspaceId,
        kind: 'api_key',
        name: 'Agent',
        sponsor_user_id: ownerId,
        scopes: ['posts:read'],
      })
      .execute();
  });
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

async function seedBy(userId: string, options: Parameters<typeof seed>[0] = {}): Promise<Seeded> {
  const seeded = await seed(options);
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('posts')
      .set({ created_by_user_id: userId })
      .where('id', '=', seeded.postId)
      .execute(),
  );
  return seeded;
}

function rowsWhere(filter: RawBuilder<boolean>) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(['user_id', 'kind', 'post_id', 'destination_id', 'incident_id', 'payload'])
      .select('dedupe_key')
      .where(filter)
      .orderBy('user_id')
      .execute(),
  );
}

const ofDestination = (seeded: Seeded) => rowsWhere(sql`destination_id = ${seeded.destinationId}`);
const ofAccount = (seeded: Seeded) =>
  rowsWhere(sql`payload->>'socialAccountId' = ${seeded.accountId}`);

const sorted = (ids: readonly string[]) => [...ids].sort();

describe('destination notifications', () => {
  it('notifies the creator and every workspace owner and admin of a failure', async () => {
    const seeded = await seedBy(creatorId);
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected' },
      at: 'after_public',
    });
    await publish(seeded);
    const rows = await ofDestination(seeded);
    expect(rows.map((row) => row.user_id)).toEqual(sorted([ownerId, creatorId, adminId]));
    for (const row of rows) {
      expect(row).toMatchObject({
        kind: 'destination.failed',
        post_id: seeded.postId,
        incident_id: null,
        payload: {
          provider: FAKE_PROVIDER,
          socialAccountId: seeded.accountId,
          state: 'failed',
          reason: 'permanent_error',
        },
      });
    }
    const event = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('dedupe_key')
        .where('subject_id', '=', seeded.destinationId)
        .executeTakeFirstOrThrow(),
    );
    expect(rows[0]?.dedupe_key).toBe(event.dedupe_key);
  });

  it('writes one row for a creator who is also an admin', async () => {
    const seeded = await seedBy(adminId);
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected' },
      at: 'after_public',
    });
    await publish(seeded);
    const rows = await ofDestination(seeded);
    expect(rows.map((row) => row.user_id)).toEqual(sorted([ownerId, adminId]));
  });

  it('notifies unconfirmed and awaiting-manual destinations but not published or blocked', async () => {
    const unconfirmed = await seedBy(creatorId);
    fake.script({ kind: 'fail', error: { kind: 'auth_revoked' }, at: 'after_public' });
    await publish(unconfirmed);
    const manual = await seedBy(creatorId, { deliveryMode: 'reminder' });
    await publish(manual);
    const published = await seedBy(creatorId);
    fake.script({ kind: 'publish', remoteId: 'r-notify' });
    await publish(published);
    const blocked = await seedBy(creatorId);
    fake.script({ kind: 'fail', error: { kind: 'auth_revoked' }, at: 'before_public' });
    await publish(blocked);

    const kinds = async (seeded: Seeded) => [
      ...new Set((await ofDestination(seeded)).map((r) => r.kind)),
    ];
    expect(await kinds(unconfirmed)).toEqual(['destination.unconfirmed']);
    expect(await kinds(manual)).toEqual(['destination.awaiting_manual']);
    expect(await kinds(published)).toEqual([]);
    expect(await kinds(blocked)).toEqual([]);
  });

  it('adds no rows when the same transition event is replayed', async () => {
    const seeded = await seedBy(creatorId);
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected' },
      at: 'after_public',
    });
    await publish(seeded);
    const before = await ofDestination(seeded);
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      auditTransition(
        trx,
        {
          workspaceId,
          id: seeded.destinationId,
          postId: seeded.postId,
          postVersion: 1,
          socialAccountId: seeded.accountId,
          version: 0,
        },
        { state: 'failed', reason: 'permanent_error' },
        null,
      ),
    );
    expect(await ofDestination(seeded)).toEqual(before);
  });
});

describe('channel notifications', () => {
  it('notifies owners and admins once when an active account flips to needs_reauth', async () => {
    const seeded = await seedBy(creatorId);
    const flag = () =>
      db.withTenant(workspaceId, SYSTEM, (trx) =>
        flagAccount(trx, {
          workspaceId,
          socialAccountId: seeded.accountId,
          fence: { unchangedSince: new Date() },
          incident: 'auth_revoked',
        }),
      );
    await flag();
    const incident = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('channel_incidents')
        .select('id')
        .where('social_account_id', '=', seeded.accountId)
        .where('resolved_at', 'is', null)
        .executeTakeFirstOrThrow(),
    );
    const rows = await ofAccount(seeded);
    expect(rows.map((row) => row.user_id)).toEqual(sorted([ownerId, adminId]));
    for (const row of rows) {
      expect(row).toMatchObject({
        kind: 'channel.needs_reauth',
        post_id: null,
        destination_id: null,
        incident_id: incident.id,
        payload: {
          provider: FAKE_PROVIDER,
          socialAccountId: seeded.accountId,
          reason: 'auth_revoked',
        },
      });
      expect(row.dedupe_key).toMatch(`channel.needs_reauth.${seeded.accountId}.`);
    }

    await flag();
    expect(await ofAccount(seeded)).toEqual(rows);
  });
});
