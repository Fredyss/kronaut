import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { saveCredential } from '../credential-store.ts';
import { BACKOFF_BASE_MS } from './backoff.ts';
import { reapLeases, reconcile } from './sweeps.ts';
import {
  audits,
  CLI,
  db,
  deps,
  fake,
  keyring,
  owner,
  publish,
  queuedRunAt,
  SYSTEM,
  seed,
  setPaused,
  startHarness,
  stopHarness,
  strand,
  updateDestination,
  verifyRunAt,
  workspaceId,
} from './testing/harness.ts';
import { fakeVerifyDefaults, type Seeded } from './testing.ts';
import { runVerify } from './verify.ts';

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

describe('verifier', () => {
  const WINDOW_MS = 3_600_000;

  beforeEach(() => {
    fake.configure({ mode: 'deterministic_id', windowMs: WINDOW_MS, poll: false });
  });

  afterEach(() => {
    fake.configure(fakeVerifyDefaults);
  });

  function verify(seeded: Seeded): Promise<void> {
    return runVerify(deps, { workspaceId, id: seeded.destinationId });
  }

  function makeDue(seeded: Seeded) {
    return updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
  }

  async function ambiguous(): Promise<Seeded> {
    const seeded = await seed();
    fake.script({ kind: 'fail', error: { kind: 'ambiguous' }, at: 'after_public' });
    await publish(seeded);
    await makeDue(seeded);
    return seeded;
  }

  it('enqueues a verify job when an ambiguous public step finalizes', async () => {
    const seeded = await seed();
    fake.script({ kind: 'fail', error: { kind: 'ambiguous' }, at: 'after_public' });
    const before = Date.now();
    await publish(seeded);
    const row = await destination(seeded);
    expect(row).toMatchObject({ state: 'verifying', state_reason: 'ambiguous_response' });
    const runAt = row.run_at?.getTime() ?? 0;
    expect(runAt).toBeGreaterThanOrEqual(before);
    expect(runAt).toBeLessThanOrEqual(Date.now() + BACKOFF_BASE_MS);
    expect((await verifyRunAt(seeded))?.getTime()).toBe(runAt);
  });

  it('publishes a destination the verifier found', async () => {
    const seeded = await ambiguous();
    fake.scriptVerify({ kind: 'found', remoteId: 'r-found', url: 'https://fake.example.test/f' });
    await verify(seeded);
    const row = await destination(seeded);
    expect(row).toMatchObject({
      state: 'published',
      resolution: 'verified',
      remote_id: 'r-found',
      remote_url: 'https://fake.example.test/f',
      claimed_attempt_id: null,
      attempt_count: 1,
    });
    expect(row.verified_at).not.toBeNull();
    expect(fake.checks.at(-1)?.attemptNo).toBe(1);
    const all = await attempts(seeded);
    expect(all.map((a) => [a.attempt_no, a.kind, a.outcome, a.counted])).toEqual([
      [1, 'publish', 'unconfirmed', true],
      [2, 'verify', 'verify_found', false],
    ]);
    expect((await items(seeded))[0]).toMatchObject({ state: 'confirmed', remote_id: 'r-found' });
    expect(await audits(seeded)).toMatchObject([
      { action: 'destination.published', correlation_id: all[1]?.id },
    ]);
  });

  it('retries a send the verifier proved absent by its deterministic id', async () => {
    const seeded = await ambiguous();
    fake.scriptVerify({ kind: 'absent' });
    await verify(seeded);
    const row = await destination(seeded);
    expect(row).toMatchObject({ state: 'retry_wait', state_reason: 'absent_verified' });
    expect((await queuedRunAt(seeded))?.getTime()).toBe(row.run_at?.getTime());
    expect((await attempts(seeded))[1]?.outcome).toBe('verify_absent');
  });

  it('checks again later when a recent-posts match finds nothing', async () => {
    fake.configure({ mode: 'list_recent_match', windowMs: WINDOW_MS, poll: false });
    const seeded = await ambiguous();
    fake.scriptVerify({ kind: 'absent' });
    const before = Date.now();
    await verify(seeded);
    const row = await destination(seeded);
    expect(row.state).toBe('verifying');
    expect(row.run_at?.getTime()).toBeGreaterThanOrEqual(before);
    expect((await verifyRunAt(seeded))?.getTime()).toBe(row.run_at?.getTime());
  });

  it('gives up on an inconclusive check past the window', async () => {
    fake.configure({ mode: 'deterministic_id', windowMs: 0, poll: false });
    const seeded = await ambiguous();
    fake.scriptVerify({ kind: 'inconclusive' });
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'unconfirmed',
      state_reason: 'verify_window_elapsed',
    });
    expect(await audits(seeded)).toMatchObject([
      { action: 'destination.unconfirmed', error_code: 'verify_window_elapsed' },
    ]);
  });

  it('leaves a destination unconfirmed when the provider cannot verify', async () => {
    fake.configure(fakeVerifyDefaults);
    const seeded = await ambiguous();
    const checks = fake.checks.length;
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'unconfirmed',
      state_reason: 'ambiguous_response',
    });
    expect(fake.checks.length).toBe(checks);
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.unconfirmed']);
  });

  it('fails a reaped destination whose late finalize recorded a permanent error', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected', detail: 'nope' },
      at: 'after_public',
      afterPublic: async () => {
        await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
        await reapLeases(deps);
      },
    });
    await publish(seeded);
    expect(await verifyRunAt(seeded)).toBeDefined();
    await makeDue(seeded);
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'permanent_error',
      last_error_code: 'rejected',
      last_error_message: 'nope',
    });
    expect(await attempts(seeded)).toHaveLength(1);
  });

  async function reapedAuthFailure(seeded: Seeded, beforeReap?: () => Promise<void>) {
    fake.script({
      kind: 'fail',
      error: { kind: 'auth_revoked' },
      at: 'after_public',
      afterPublic: async () => {
        await beforeReap?.();
        await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
        await reapLeases(deps);
      },
    });
    await publish(seeded);
    await makeDue(seeded);
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'unconfirmed',
      state_reason: 'ambiguous_response',
    });
    return owner.withActor(SYSTEM, async (trx) => ({
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
  }

  it('leaves a reaped auth failure unconfirmed and flags the account', async () => {
    const seeded = await seed();
    expect(await reapedAuthFailure(seeded)).toEqual({
      status: 'needs_reauth',
      incidents: [{ kind: 'auth_revoked' }],
    });
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.unconfirmed']);
  });

  it('leaves the account alone when one of its credentials was rotated after the attempt', async () => {
    const seeded = await seed();
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      saveCredential(trx, keyring, {
        workspaceId,
        socialAccountId: seeded.accountId,
        kind: 'page_token',
        value: { token: 'fake-page-token' },
        grantedScopes: [],
      }),
    );
    const account = await reapedAuthFailure(seeded, async () => {
      await owner.withActor(SYSTEM, (trx) =>
        trx
          .updateTable('account_credentials')
          .set({ version: sql<number>`version + 1` })
          .where('social_account_id', '=', seeded.accountId)
          .where('kind', '=', 'oauth')
          .execute(),
      );
    });
    expect(account).toEqual({ status: 'active', incidents: [] });
  });

  it('still promotes a late publish after the verifier left the row unconfirmed', async () => {
    fake.configure(fakeVerifyDefaults);
    const seeded = await seed();
    fake.script({
      kind: 'publish',
      remoteId: 'r-late',
      afterPublic: async () => {
        await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
        await reapLeases(deps);
        await makeDue(seeded);
        await verify(seeded);
        expect((await destination(seeded)).state).toBe('unconfirmed');
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'api',
      remote_id: 'r-late',
    });
  });

  it('leaves a check in flight to the run that started it', async () => {
    const seeded = await ambiguous();
    const checks = fake.checks.length;
    fake.scriptVerify({
      kind: 'found',
      remoteId: 'r-first',
      during: () => verify(seeded),
    });
    await verify(seeded);
    expect(fake.checks.length).toBe(checks + 1);
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r-first' });
    expect((await attempts(seeded)).map((a) => a.outcome)).toEqual(['unconfirmed', 'verify_found']);
  });

  it('records a check that returns during a pause and leaves the row verifying', async () => {
    const seeded = await ambiguous();
    fake.scriptVerify({ kind: 'absent', during: () => setPaused(true) });
    try {
      await verify(seeded);
    } finally {
      await setPaused(false);
    }
    expect((await destination(seeded)).state).toBe('verifying');
    expect((await attempts(seeded))[1]?.outcome).toBe('verify_absent');
  });

  it('closes an open attempt on a reaped destination before verifying it', async () => {
    const seeded = await seed();
    await strand(seeded, { sent: true });
    await reapLeases(deps);
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'interrupted_after_send',
    });
    expect(await verifyRunAt(seeded)).toBeDefined();
    await makeDue(seeded);
    fake.scriptVerify({ kind: 'found', remoteId: 'r-reaped-found' });
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'verified',
      remote_id: 'r-reaped-found',
    });
    expect((await attempts(seeded)).map((a) => [a.attempt_no, a.outcome])).toEqual([
      [1, 'interrupted'],
      [2, 'verify_found'],
    ]);
  });

  it('polls a processing destination and gives up past the async limit', async () => {
    fake.configure({ mode: 'deterministic_id', windowMs: WINDOW_MS, poll: true });
    const seeded = await seed();
    fake.script({ kind: 'pending', pollAfterMs: 5000, afterPublic: true });
    const before = Date.now();
    await publish(seeded);
    const row = await destination(seeded);
    expect(row).toMatchObject({ state: 'verifying', state_reason: 'provider_processing' });
    expect(row.run_at?.getTime()).toBeGreaterThanOrEqual(before + 5000);
    expect((await verifyRunAt(seeded))?.getTime()).toBe(row.run_at?.getTime());
    await makeDue(seeded);
    fake.scriptPoll({ kind: 'published', remoteId: 'r-polled' });
    await verify(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'api',
      remote_id: 'r-polled',
    });

    const stale = await seed();
    await strand(stale, { sent: true, sentSecondsAgo: 7200 });
    await updateDestination(
      stale,
      sql`state = 'verifying', state_reason = 'provider_processing', version = version + 1,
          lease_until = null, run_at = now() - interval '1 second'`,
    );
    fake.scriptPoll({ kind: 'pending', pollAfterMs: 5000 });
    await verify(stale);
    expect(await destination(stale)).toMatchObject({
      state: 'unconfirmed',
      state_reason: 'verify_window_elapsed',
    });
  });

  it('re-adds a missing verify job from the reconciliation sweep', async () => {
    const seeded = await ambiguous();
    await updateDestination(seeded, sql`run_at = now() + interval '5 minutes'`);
    await owner.withActor(CLI, (trx) =>
      sql`select graphile_worker.remove_job(${`verify:${seeded.destinationId}`})`.execute(trx),
    );
    expect(await verifyRunAt(seeded)).toBeUndefined();
    expect(await reconcile(deps)).toMatch(/^ensured=[1-9]/);
    const row = await destination(seeded);
    expect((await verifyRunAt(seeded))?.getTime()).toBe(row.run_at?.getTime());
  });

  it('refuses a public step from a verifier and counts the check as inconclusive', async () => {
    const seeded = await ambiguous();
    const [sent] = await attempts(seeded);
    fake.scriptVerify({ kind: 'public_step' });
    await verify(seeded);
    expect(fake.checks.at(-1)?.events).toEqual(['refused']);
    expect((await destination(seeded)).state).toBe('verifying');
    const [publishAttempt, check] = await attempts(seeded);
    expect(publishAttempt?.public_send_at).toEqual(sent?.public_send_at);
    expect(check).toMatchObject({
      kind: 'verify',
      outcome: 'verify_inconclusive',
      public_send_at: null,
    });
  });

  it('does nothing while publishing is paused', async () => {
    const seeded = await ambiguous();
    const checks = fake.checks.length;
    await setPaused(true);
    try {
      await verify(seeded);
    } finally {
      await setPaused(false);
    }
    expect((await destination(seeded)).state).toBe('verifying');
    expect(await attempts(seeded)).toHaveLength(1);
    expect(fake.checks.length).toBe(checks);
  });
});
