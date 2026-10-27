import { createHash } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE_TEXT_MAX, type Seeded } from './testing.ts';
import {
  audits,
  CLI,
  createApp,
  createUser,
  fake,
  owner,
  publish,
  queuedRunAt,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  TEXT,
  updateDestination,
  workspaceId,
} from './testing-harness.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-publish');
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

function destination(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .selectAll()
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

function attempts(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('publish_attempts')
      .selectAll()
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('attempt_no')
      .execute(),
  );
}

function items(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_items')
      .selectAll()
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('position')
      .execute(),
  );
}

describe('publish job', () => {
  it('publishes a scheduled destination', async () => {
    const seeded = await seed();
    fake.script({ kind: 'publish', remoteId: 'r-1', url: 'https://fake.example.test/r-1' });
    await publish(seeded);

    const row = await destination(seeded);
    expect(row).toMatchObject({
      state: 'published',
      state_reason: null,
      remote_id: 'r-1',
      remote_url: 'https://fake.example.test/r-1',
      resolution: 'api',
      lease_until: null,
      claimed_attempt_id: null,
      attempt_count: 1,
    });
    const [attempt, ...rest] = await attempts(seeded);
    expect(rest).toHaveLength(0);
    expect(attempt).toMatchObject({
      outcome: 'ok',
      counted: true,
      attempt_no: 1,
      remote_id: 'r-1',
    });
    expect(attempt?.public_send_at).not.toBeNull();
    const [item] = await items(seeded);
    expect(item).toMatchObject({ state: 'confirmed', remote_id: 'r-1', rendered_text: TEXT });
    expect(item?.rendered_sha256).toEqual(createHash('sha256').update(TEXT).digest());
    expect(await audits(seeded)).toEqual([
      {
        action: 'destination.published',
        error_code: null,
        correlation_id: attempt?.id,
        actor_kind: 'system',
        surface: 'worker',
        post_id: seeded.postId,
      },
    ]);
    const post = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('posts')
        .select('publish_summary')
        .where('id', '=', seeded.postId)
        .executeTakeFirstOrThrow(),
    );
    expect(post.publish_summary).toBe('completed_all');
    expect(fake.calls.at(-1)?.events).toEqual(['upload', 'public']);
  });

  it('does nothing while publishing is paused', async () => {
    const seeded = await seed();
    await owner.withActor(CLI, (trx) =>
      sql`
        insert into instance_state (instance_id, publishing_paused, paused_reason)
        values (gen_random_uuid(), true, 'operator')
        on conflict (singleton) do update set publishing_paused = true, paused_reason = 'operator'
      `.execute(trx),
    );
    const calls = fake.calls.length;
    try {
      await publish(seeded);
    } finally {
      await owner.withActor(CLI, (trx) =>
        sql`update instance_state set publishing_paused = false, paused_reason = null`.execute(trx),
      );
    }
    expect((await destination(seeded)).state).toBe('scheduled');
    expect(await attempts(seeded)).toHaveLength(0);
    expect(fake.calls.length).toBe(calls);
  });

  it('hands a reminder to the user', async () => {
    const seeded = await seed({ deliveryMode: 'reminder' });
    await publish(seeded);
    expect((await destination(seeded)).state).toBe('awaiting_manual');
    expect(await attempts(seeded)).toHaveLength(0);
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.awaiting_manual']);
  });

  it('fails a destination past its deadline', async () => {
    const seeded = await seed({ deadlineSeconds: -60 });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'late_window_exceeded',
    });
    expect(await attempts(seeded)).toHaveLength(0);
  });

  it('blocks a disabled account', async () => {
    const seeded = await seed();
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('social_accounts')
        .set({ status: 'disabled' })
        .where('id', '=', seeded.accountId)
        .execute(),
    );
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'blocked',
      state_reason: 'account_disabled',
    });
  });

  it('blocks a destination whose provider app is misconfigured', async () => {
    const app = await createApp('fake-client-misconfigured');
    const seeded = await seed({ appId: app });
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('provider_apps')
        .set({ status: 'misconfigured' })
        .where('id', '=', app)
        .execute(),
    );
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'blocked',
      state_reason: 'app_credentials_invalid',
    });
    expect(await attempts(seeded)).toHaveLength(0);
  });

  it('blocks when the scheduler is no longer a member', async () => {
    const editorId = await createUser('editor');
    await owner.withActor(CLI, (trx) =>
      trx
        .insertInto('memberships')
        .values({ workspace_id: workspaceId, user_id: editorId, role: 'editor' })
        .execute(),
    );
    const seeded = await seed({ schedulerId: editorId });
    expect((await destination(seeded)).scheduled_by_user_id).toBe(editorId);
    await owner.withActor(CLI, (trx) =>
      trx.deleteFrom('memberships').where('user_id', '=', editorId).execute(),
    );
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'blocked',
      state_reason: 'policy_denied',
    });
    const [audit] = await audits(seeded);
    expect(audit).toMatchObject({ action: 'destination.blocked', error_code: 'policy_denied' });
    expect(audit?.correlation_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('fails a destination that no longer passes preflight', async () => {
    const seeded = await seed({ text: 'x'.repeat(FAKE_TEXT_MAX + 1) });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'permanent_error',
      last_error_code: 'preflight_invalid',
      last_error_message: 'text_too_long',
    });
  });

  it('re-enqueues without an attempt while the account is busy', async () => {
    const busy = await seed();
    await updateDestination(
      busy,
      sql`state = 'publishing', version = version + 1, lease_until = now() + interval '120 seconds',
          claimed_attempt_id = gen_random_uuid()`,
    );
    const seeded = await seed({ accountId: busy.accountId });
    const before = Date.now();
    await publish(seeded);
    expect((await destination(seeded)).state).toBe('scheduled');
    expect(await attempts(seeded)).toHaveLength(0);
    const runAt = await queuedRunAt(seeded);
    expect(runAt?.getTime()).toBeGreaterThanOrEqual(before + 15_000);
    expect(runAt?.getTime()).toBeLessThanOrEqual(Date.now() + 30_000);
  });
});
