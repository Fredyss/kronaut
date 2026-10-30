import { randomUUID } from 'node:crypto';
import type { MediaLimits } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { restartPublishProgress } from '../posts/destinations.ts';
import { MAX_ATTEMPTS } from './plan.ts';
import { reapLeases } from './sweeps.ts';
import {
  deps,
  fake,
  owner,
  publish,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  updateDestination,
  workspaceId,
} from './testing/harness.ts';
import { FAKE_TEXT_MAX, fakeManifest, fakeVerifyDefaults, type Seeded } from './testing.ts';
import { runVerify } from './verify.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-chain');
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

afterEach(() => {
  fake.configureChain({});
  fake.configure(fakeVerifyDefaults);
});

function postMedia(): MediaLimits {
  const media = fakeManifest.postTypes[0]?.media;
  if (media === undefined) throw new Error('the fake provider has no post type');
  return media;
}

function threads(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    role: 'thread' as const,
    text: `reply ${index + 1}`,
  }));
}

function allowThreads(maxItems = 10): void {
  fake.configureChain({ thread: { maxItems, media: postMedia() } });
}

function destination(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['state', 'state_reason', 'remote_id', 'remote_url', 'attempt_count'])
      .select(['published_at', 'provider_state', 'resolution'])
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

function items(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_items')
      .select(['position', 'role', 'state', 'remote_id', 'reply_to_remote_id', 'anchor'])
      .select('provider_state')
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('position')
      .execute(),
  );
}

function attempts(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('publish_attempts')
      .select(['id', 'kind', 'counted', 'item_position', 'outcome', 'anchor'])
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('attempt_no')
      .execute(),
  );
}

function makeDue(seeded: Seeded) {
  return updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
}

function callsFrom(start: number) {
  return fake.calls.slice(start);
}

function sendsPerPosition(start: number): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const call of callsFrom(start)) {
    for (const position of call.positions) counts[position] = (counts[position] ?? 0) + 1;
  }
  return counts;
}

describe('reply chains', () => {
  it('publishes a chain one item per claim and hands each item the confirmed links', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(2) });
    const start = fake.calls.length;
    fake.script(
      {
        kind: 'publish',
        remoteId: 'r0',
        url: 'https://fake.example.test/r0',
        anchor: { cid: 'c0' },
      },
      { kind: 'publish', remoteId: 'r1', anchor: { cid: 'c1' } },
      { kind: 'publish', remoteId: 'r2' },
    );
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'chain_next',
      remote_id: 'r0',
      remote_url: 'https://fake.example.test/r0',
      attempt_count: 0,
      resolution: null,
    });
    expect((await destination(seeded)).published_at).not.toBeNull();
    await publish(seeded);
    await publish(seeded);

    const calls = callsFrom(start);
    expect(calls.map((call) => call.positions)).toEqual([[0], [1], [2]]);
    expect(calls[0]?.chain).toEqual([]);
    expect(calls[1]?.chain).toEqual([
      { position: 0, role: 'main', remoteId: 'r0', anchor: { cid: 'c0' } },
    ]);
    expect(calls[2]?.chain.map((link) => link.remoteId)).toEqual(['r0', 'r1']);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: 'r0',
      remote_url: 'https://fake.example.test/r0',
      resolution: 'api',
    });
    expect(await items(seeded)).toMatchObject([
      { position: 0, state: 'confirmed', remote_id: 'r0', reply_to_remote_id: null },
      { position: 1, state: 'confirmed', remote_id: 'r1', reply_to_remote_id: 'r0' },
      { position: 2, state: 'confirmed', remote_id: 'r2', reply_to_remote_id: 'r1' },
    ]);
    expect((await items(seeded))[0]?.anchor).toEqual({ cid: 'c0' });
  });

  it('counts the claim after chain_next and gives each item at most MAX_ATTEMPTS sends', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(1) });
    const start = fake.calls.length;
    const transient = { kind: 'fail', error: { kind: 'transient' }, at: 'before_public' } as const;
    fake.script(
      { kind: 'publish', remoteId: 'r0' },
      ...Array.from({ length: MAX_ATTEMPTS }, () => transient),
    );
    await publish(seeded);
    expect((await destination(seeded)).attempt_count).toBe(0);
    for (let send = 0; send < MAX_ATTEMPTS; send++) {
      await makeDue(seeded);
      await publish(seeded);
    }
    expect(sendsPerPosition(start)).toEqual({ 0: 1, 1: MAX_ATTEMPTS });
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'thread_incomplete',
      attempt_count: MAX_ATTEMPTS,
    });
    const recorded = await attempts(seeded);
    expect(recorded.every((a) => a.counted)).toBe(true);
    expect(recorded.map((a) => a.item_position)).toEqual([
      0,
      ...Array.from({ length: MAX_ATTEMPTS }, () => 1),
    ]);
  });

  it('measures an async later item from its own attempts, not the main item', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(1) });
    const backdate = async () => {
      await owner.withActor(SYSTEM, (trx) =>
        sql`update publish_attempts set started_at = now() - interval '2 hours'
            where destination_id = ${seeded.destinationId} and finished_at is null`.execute(trx),
      );
    };
    fake.script(
      { kind: 'publish', remoteId: 'r0', beforePublic: backdate },
      { kind: 'pending', pollAfterMs: 1000 },
    );
    await publish(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'provider_processing',
    });
  });

  it('fails a claim-time preflight error on a later item as thread_incomplete', async () => {
    allowThreads();
    const seeded = await seed({ items: [{ role: 'thread', text: 'x'.repeat(FAKE_TEXT_MAX + 1) }] });
    await updateDestination(seeded, sql`preflight_acked_codes = array['text_too_long']`);
    fake.script({ kind: 'publish', remoteId: 'r0' });
    await publish(seeded);
    await updateDestination(seeded, sql`preflight_acked_codes = '{}'`);
    const start = fake.calls.length;
    await publish(seeded);
    expect(callsFrom(start)).toEqual([]);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'thread_incomplete',
      remote_id: 'r0',
    });
    expect((await items(seeded)).map((item) => item.state)).toEqual(['confirmed', 'failed']);
    const event = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('payload')
        .where('subject_id', '=', seeded.destinationId)
        .where('type', '=', 'destination.failed')
        .executeTakeFirstOrThrow(),
    );
    expect(event.payload).toMatchObject({ data: { failed_item_position: 1 } });
  });

  it('moves each item checkpoint onto the item and clears the destination', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(1) });
    fake.script(
      { kind: 'publish', remoteId: 'r0', checkpoint: { upload: 'u0' } },
      { kind: 'publish', remoteId: 'r1', checkpoint: { upload: 'u1' } },
    );
    await publish(seeded);
    const start = fake.calls.length;
    await publish(seeded);
    expect(callsFrom(start)[0]?.state).toEqual({});
    expect((await items(seeded)).map((item) => item.provider_state)).toEqual([
      { upload: 'u0' },
      { upload: 'u1' },
    ]);
    expect((await destination(seeded)).provider_state).toEqual({});
  });

  it('thread_crash_after_part_3: verifies the interrupted item and sends the rest once', async () => {
    allowThreads();
    fake.configure({ mode: 'deterministic_id', windowMs: 3_600_000, poll: false });
    const seeded = await seed({ items: threads(3) });
    const start = fake.calls.length;
    const checksStart = fake.checks.length;
    const crash = async () => {
      await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
      await reapLeases(deps);
    };
    fake.script(
      { kind: 'publish', remoteId: 'r0' },
      { kind: 'publish', remoteId: 'r1' },
      { kind: 'fail', error: { kind: 'ambiguous' }, at: 'after_public', afterPublic: crash },
      { kind: 'publish', remoteId: 'r3' },
    );
    await publish(seeded);
    await publish(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'interrupted_after_send',
    });
    expect((await items(seeded)).map((item) => item.state)).toEqual([
      'confirmed',
      'confirmed',
      'sending',
      'pending',
    ]);

    fake.scriptVerify({ kind: 'found', remoteId: 'r2' });
    await makeDue(seeded);
    await runVerify(deps, { workspaceId, id: seeded.destinationId });
    const check = fake.checks.slice(checksStart);
    expect(check.map((call) => call.positions)).toEqual([[2]]);
    expect(check[0]?.chain.map((link) => link.remoteId)).toEqual(['r0', 'r1']);
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'chain_next',
    });
    await publish(seeded);

    const verifyAttempts = (await attempts(seeded)).filter((a) => a.kind === 'verify');
    expect(verifyAttempts.map((a) => a.item_position)).toEqual([2]);
    expect(sendsPerPosition(start)).toEqual({ 0: 1, 1: 1, 2: 1, 3: 1 });
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r0' });
    expect(await items(seeded)).toMatchObject([
      { state: 'confirmed', remote_id: 'r0' },
      { state: 'confirmed', remote_id: 'r1' },
      { state: 'confirmed', remote_id: 'r2', reply_to_remote_id: 'r1' },
      { state: 'confirmed', remote_id: 'r3', reply_to_remote_id: 'r2' },
    ]);
  });

  it('promotes the anchor a fenced-out finalize recorded and hands it to the next item', async () => {
    allowThreads();
    fake.configure({ mode: 'deterministic_id', windowMs: 3_600_000, poll: false });
    const seeded = await seed({ items: threads(1) });
    const fence = async () => {
      await updateDestination(seeded, sql`claimed_attempt_id = ${randomUUID()}`);
    };
    fake.script(
      { kind: 'publish', remoteId: 'r0', anchor: { cid: 'c0' }, afterPublic: fence },
      { kind: 'publish', remoteId: 'r1' },
    );
    await publish(seeded);
    const [recorded] = await attempts(seeded);
    expect(recorded).toMatchObject({ outcome: 'ok', item_position: 0, anchor: { cid: 'c0' } });
    expect((await destination(seeded)).state).toBe('publishing');

    await updateDestination(
      seeded,
      sql`state = 'verifying', state_reason = 'interrupted_after_send', version = version + 1,
          lease_until = null, claimed_attempt_id = ${recorded?.id ?? null},
          run_at = now() - interval '1 second'`,
    );
    await runVerify(deps, { workspaceId, id: seeded.destinationId });
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'chain_next',
      remote_id: 'r0',
    });
    expect((await items(seeded))[0]).toMatchObject({ state: 'confirmed', anchor: { cid: 'c0' } });
    const start = fake.calls.length;
    await publish(seeded);
    expect(callsFrom(start)[0]?.chain).toEqual([
      { position: 0, role: 'main', remoteId: 'r0', anchor: { cid: 'c0' } },
    ]);
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r0' });
  });

  it('fails a permanent later item as thread_incomplete and resumes it on send again', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(3) });
    const start = fake.calls.length;
    fake.script(
      { kind: 'publish', remoteId: 'r0', url: 'https://fake.example.test/r0' },
      { kind: 'publish', remoteId: 'r1' },
      { kind: 'fail', error: { kind: 'permanent', code: 'rejected' }, at: 'before_public' },
    );
    await publish(seeded);
    await publish(seeded);
    await publish(seeded);
    const failed = await destination(seeded);
    expect(failed).toMatchObject({
      state: 'failed',
      state_reason: 'thread_incomplete',
      remote_id: 'r0',
      remote_url: 'https://fake.example.test/r0',
    });
    expect(failed.published_at).not.toBeNull();
    expect((await items(seeded)).map((item) => item.state)).toEqual([
      'confirmed',
      'confirmed',
      'failed',
      'pending',
    ]);
    const event = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('payload')
        .where('subject_id', '=', seeded.destinationId)
        .where('type', '=', 'destination.failed')
        .executeTakeFirstOrThrow(),
    );
    expect(event.payload).toMatchObject({
      data: { reason: 'thread_incomplete', remote_id: 'r0', failed_item_position: 2 },
    });
    const completed = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('payload')
        .where('subject_id', '=', seeded.postId)
        .where('type', '=', 'post.completed')
        .executeTakeFirstOrThrow(),
    );
    expect(completed.payload).toMatchObject({ data: { failed: 1, incomplete: 1 } });

    await owner.withActor(SYSTEM, async (trx) => {
      await restartPublishProgress(trx, workspaceId, [seeded.destinationId]);
    });
    await updateDestination(
      seeded,
      sql`state = 'scheduled', state_reason = null, version = version + 1, attempt_count = 0,
          run_at = now() - interval '1 second'`,
    );
    fake.script({ kind: 'publish', remoteId: 'r2' }, { kind: 'publish', remoteId: 'r3' });
    await publish(seeded);
    await publish(seeded);
    expect(sendsPerPosition(start)).toEqual({ 0: 1, 1: 1, 2: 2, 3: 1 });
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r0' });
    expect((await items(seeded)).map((item) => item.remote_id)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });

  it('keeps sending a chain past its deadline once the main item is live', async () => {
    allowThreads();
    const seeded = await seed({ items: threads(1) });
    fake.script(
      { kind: 'publish', remoteId: 'r0' },
      { kind: 'fail', error: { kind: 'transient' }, at: 'before_public' },
      { kind: 'publish', remoteId: 'r1' },
    );
    await publish(seeded);
    await updateDestination(seeded, sql`deadline_at = now() - interval '1 hour'`);
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'retry_wait',
      state_reason: 'transient_error',
    });
    expect((await items(seeded))[1]?.state).toBe('pending');
    await makeDue(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r0' });
  });

  it('freezes items the post type does not take as skipped and publishes main only', async () => {
    const seeded = await seed({ items: [...threads(2), { role: 'comment', text: 'first' }] });
    const start = fake.calls.length;
    fake.script({ kind: 'publish', remoteId: 'r0' });
    await publish(seeded);
    expect(callsFrom(start).map((call) => call.positions)).toEqual([[0]]);
    expect(await destination(seeded)).toMatchObject({ state: 'published', remote_id: 'r0' });
    expect((await items(seeded)).map((item) => [item.role, item.state])).toEqual([
      ['main', 'confirmed'],
      ['thread', 'skipped'],
      ['thread', 'skipped'],
      ['comment', 'skipped'],
    ]);
  });

  it('skips thread items beyond the post type maxItems', async () => {
    allowThreads(1);
    const seeded = await seed({ items: threads(2) });
    fake.script({ kind: 'publish', remoteId: 'r0' }, { kind: 'publish', remoteId: 'r1' });
    await publish(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({ state: 'published' });
    expect((await items(seeded)).map((item) => item.state)).toEqual([
      'confirmed',
      'confirmed',
      'skipped',
    ]);
  });
});
