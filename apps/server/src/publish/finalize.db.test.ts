import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BACKOFF_BASE_MS } from './backoff.ts';
import type { Seeded } from './testing.ts';
import {
  audits,
  CLI,
  createApp,
  fake,
  owner,
  publish,
  queuedRunAt,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  updateDestination,
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
  it('backs off a transient error and gives up after six attempts', async () => {
    const seeded = await seed();
    fake.script({ kind: 'fail', error: { kind: 'transient' }, at: 'before_public' });
    const before = Date.now();
    await publish(seeded);
    const row = await destination(seeded);
    expect(row).toMatchObject({ state: 'retry_wait', state_reason: 'transient_error' });
    const runAt = row.run_at?.getTime() ?? 0;
    expect(runAt).toBeGreaterThanOrEqual(before);
    expect(runAt).toBeLessThanOrEqual(Date.now() + BACKOFF_BASE_MS);
    expect((await queuedRunAt(seeded))?.getTime()).toBe(runAt);
    expect((await attempts(seeded))[0]).toMatchObject({
      outcome: 'retry_not_sent',
      error_code: 'transient',
    });

    const tired = await seed({ attemptCount: 5 });
    fake.script({ kind: 'fail', error: { kind: 'transient' }, at: 'before_public' });
    await publish(tired);
    expect(await destination(tired)).toMatchObject({
      state: 'failed',
      state_reason: 'attempts_exhausted',
      attempt_count: 6,
    });
    expect((await items(tired))[0]?.state).toBe('skipped');
  });

  it('fails a rate limit that resets past the deadline', async () => {
    const seeded = await seed();
    const resetAt = Temporal.Now.instant().add({ hours: 2 });
    fake.script({
      kind: 'fail',
      error: { kind: 'rate_limited', scope: 'account', resetAt },
      at: 'before_public',
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'rate_limit_beyond_deadline',
    });
    const [attempt] = await attempts(seeded);
    expect(attempt?.outcome).toBe('rate_limited');
    expect(attempt?.retry_after?.getTime()).toBe(resetAt.epochMilliseconds);
  });

  it('polls a pending publish with its checkpoint and an uncounted attempt', async () => {
    const seeded = await seed();
    fake.script({ kind: 'pending', pollAfterMs: 5000, checkpoint: { container: 'c-1' } });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'provider_processing',
      provider_state: { container: 'c-1' },
      attempt_count: 1,
    });

    await updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
    fake.script({ kind: 'publish', remoteId: 'r-pending' });
    await publish(seeded);
    expect(fake.calls.at(-1)?.state).toEqual({ container: 'c-1' });
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: 'r-pending',
      attempt_count: 1,
    });
    expect((await attempts(seeded)).map((a) => [a.attempt_no, a.counted, a.outcome])).toEqual([
      [1, true, 'retry_not_sent'],
      [2, false, 'ok'],
    ]);
  });

  it('verifies an ambiguous public step and retries an ambiguous private one', async () => {
    const after = await seed();
    fake.script({ kind: 'fail', error: { kind: 'ambiguous' }, at: 'after_public' });
    await publish(after);
    expect(await destination(after)).toMatchObject({
      state: 'verifying',
      state_reason: 'ambiguous_response',
    });
    const [sent] = await attempts(after);
    expect(sent?.public_send_at).not.toBeNull();
    expect(sent?.outcome).toBe('unconfirmed');
    expect((await items(after))[0]?.state).toBe('sending');

    const before = await seed();
    fake.script({ kind: 'fail', error: { kind: 'ambiguous' }, at: 'before_public' });
    await publish(before);
    expect(await destination(before)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'interrupted_safe',
      attempt_count: 1,
    });
  });

  it('verifies a duplicate without a remote id instead of sending again', async () => {
    const seeded = await seed();
    fake.script({ kind: 'fail', error: { kind: 'duplicate' }, at: 'before_public' });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'ambiguous_response',
    });
    expect((await attempts(seeded))[0]?.outcome).toBe('duplicate');
  });

  it('verifies an unknown error raised by a step after the public one', async () => {
    const seeded = await seed();
    fake.script({ kind: 'crash_after_public' });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'ambiguous_response',
    });
  });

  it('fails the sent item on a permanent error after the public step', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected' },
      at: 'after_public',
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'permanent_error',
    });
    expect((await items(seeded))[0]?.state).toBe('failed');
  });

  it('cancels instead of sending when a cancel was requested', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'publish',
      beforePublic: async () => {
        await updateDestination(seeded, sql`cancel_requested_at = now()`);
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'canceled',
      state_reason: 'user_canceled',
    });
    expect(fake.calls.at(-1)?.events).toEqual(['upload', 'refused']);
    const [attempt] = await attempts(seeded);
    expect(attempt).toMatchObject({ outcome: 'canceled', public_send_at: null });
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.canceled']);
  });

  it('cancels a run that failed before sending once a cancel was accepted', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'fail',
      error: { kind: 'transient' },
      at: 'before_public',
      beforePublic: async () => {
        await updateDestination(seeded, sql`cancel_requested_at = now()`);
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'canceled',
      state_reason: 'user_canceled',
    });
    expect((await attempts(seeded))[0]).toMatchObject({ outcome: 'retry_not_sent' });
  });

  it('never sends once the lease is lost', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'publish',
      beforePublic: async () => {
        await updateDestination(seeded, sql`lease_until = now() - interval '1 second'`);
      },
    });
    await publish(seeded);
    expect((await destination(seeded)).state).toBe('publishing');
    expect(fake.calls.at(-1)?.events).toEqual(['upload', 'refused']);
    const [attempt] = await attempts(seeded);
    expect(attempt).toMatchObject({ public_send_at: null, outcome: 'retry_not_sent' });
  });

  it('publishes a destination the reaper moved to verifying', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'publish',
      remoteId: 'r-late',
      afterPublic: async () => {
        await updateDestination(
          seeded,
          sql`state = 'verifying', state_reason = 'interrupted_after_send', version = version + 1,
              lease_until = null`,
        );
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'api',
      remote_id: 'r-late',
      claimed_attempt_id: null,
    });
  });

  it('flags the account on a revoked token and bumps the open incident', async () => {
    const first = await seed();
    fake.script({ kind: 'fail', error: { kind: 'auth_revoked' }, at: 'before_public' });
    await publish(first);
    expect(await destination(first)).toMatchObject({
      state: 'blocked',
      state_reason: 'account_needs_reauth',
    });
    const incidents = () =>
      owner.withActor(SYSTEM, (trx) =>
        trx
          .selectFrom('channel_incidents')
          .select(['kind', 'occurrences', 'resolved_at'])
          .where('social_account_id', '=', first.accountId)
          .execute(),
      );
    const status = () =>
      owner.withActor(SYSTEM, (trx) =>
        trx
          .selectFrom('social_accounts')
          .select('status')
          .where('id', '=', first.accountId)
          .executeTakeFirstOrThrow(),
      );
    expect((await status()).status).toBe('needs_reauth');
    expect(await incidents()).toEqual([
      { kind: 'auth_revoked', occurrences: 1, resolved_at: null },
    ]);

    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('social_accounts')
        .set({ status: 'active' })
        .where('id', '=', first.accountId)
        .execute(),
    );
    const second = await seed({ accountId: first.accountId });
    fake.script({ kind: 'fail', error: { kind: 'auth_revoked' }, at: 'before_public' });
    await publish(second);
    expect((await status()).status).toBe('needs_reauth');
    expect(await incidents()).toEqual([
      { kind: 'auth_revoked', occurrences: 2, resolved_at: null },
    ]);
  });

  it('leaves an account reconnected during the attempt alone', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'fail',
      error: { kind: 'auth_revoked' },
      at: 'before_public',
      beforePublic: async () => {
        await owner.withActor(SYSTEM, (trx) =>
          trx
            .updateTable('account_credentials')
            .set({ version: sql<number>`version + 1` })
            .where('social_account_id', '=', seeded.accountId)
            .execute(),
        );
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'blocked',
      state_reason: 'account_needs_reauth',
    });
    const account = await owner.withActor(SYSTEM, async (trx) => ({
      status: (
        await trx
          .selectFrom('social_accounts')
          .select('status')
          .where('id', '=', seeded.accountId)
          .executeTakeFirstOrThrow()
      ).status,
      incidents: await trx
        .selectFrom('channel_incidents')
        .select('kind')
        .where('social_account_id', '=', seeded.accountId)
        .execute(),
    }));
    expect(account).toEqual({ status: 'active', incidents: [] });
  });

  it('leaves an auth failure after the public step unconfirmed and flags the account', async () => {
    const seeded = await seed();
    fake.script({ kind: 'fail', error: { kind: 'auth_revoked' }, at: 'after_public' });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'unconfirmed',
      state_reason: 'ambiguous_response',
    });
    expect((await attempts(seeded))[0]).toMatchObject({ outcome: 'auth_revoked' });
    expect((await items(seeded)).map((item) => item.state)).toEqual(['unconfirmed']);
    const account = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select('status')
        .where('id', '=', seeded.accountId)
        .executeTakeFirstOrThrow(),
    );
    expect(account.status).toBe('needs_reauth');
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.unconfirmed']);
  });

  it('marks the provider app misconfigured on an app_config error', async () => {
    const app = await createApp('fake-client-broken');
    const seeded = await seed({ appId: app });
    fake.script({
      kind: 'fail',
      error: { kind: 'app_config', code: 'bad_client' },
      at: 'before_public',
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'blocked',
      state_reason: 'app_credentials_invalid',
    });
    const state = await owner.withActor(CLI, async (trx) => ({
      app: await trx
        .selectFrom('provider_apps')
        .select('status')
        .where('id', '=', app)
        .executeTakeFirstOrThrow(),
      incidents: await trx
        .selectFrom('provider_app_incidents')
        .select(['kind', 'detail_code', 'occurrences'])
        .where('provider_app_id', '=', app)
        .execute(),
      account: await trx
        .selectFrom('social_accounts')
        .select('status')
        .where('id', '=', seeded.accountId)
        .executeTakeFirstOrThrow(),
    }));
    expect(state).toEqual({
      app: { status: 'misconfigured' },
      incidents: [{ kind: 'app_credentials_invalid', detail_code: 'bad_client', occurrences: 1 }],
      account: { status: 'active' },
    });
  });
});
