import { createHash } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountA,
  call,
  errorOf,
  grantAuth,
  inMinutes,
  insertGrant,
  jobRunAt,
  owner,
  ownerAuth,
  SYSTEM,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from '../posts/testing.ts';
import { act, auditsOf, destinationRow, type InState, ok, postIn } from './testing.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

function seedItems(
  target: InState,
  states: readonly ('confirmed' | 'failed' | 'sending' | 'pending')[],
) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('destination_items')
      .values(
        states.map((state, position) => ({
          workspace_id: workspaceId,
          destination_id: target.destinationId,
          position,
          role: position === 0 ? 'main' : 'thread',
          state,
          rendered_text: `part ${position}`,
          rendered_sha256: createHash('sha256').update(`part ${position}`).digest(),
          send_started_at: state === 'pending' ? null : new Date(),
          remote_id: state === 'confirmed' ? `r-${position}` : null,
        })),
      )
      .execute(),
  );
}

function itemsOf(target: InState) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_items')
      .select(['position', 'state', 'remote_id'])
      .where('destination_id', '=', target.destinationId)
      .orderBy('position')
      .execute(),
  );
}

function instantOf(local: string): Date {
  return new Date(Temporal.PlainDateTime.from(local).toZonedDateTime(TZ).epochMilliseconds);
}

describe('destinations.mark_published', () => {
  it.each(['unconfirmed', 'awaiting_manual'] as const)(
    'marks %s published by hand',
    async (state) => {
      const target = await postIn(state);
      const post = await ok(await act(target, 'mark-published'));
      expect(post.destinations[0]).toMatchObject({ state: 'published', stateReason: null });
      expect(post.version).toBeGreaterThan(target.post.version);
      const row = await destinationRow(target.destinationId);
      expect(row).toMatchObject({ state: 'published', resolution: 'manual' });
      expect(row.published_at).toBeInstanceOf(Date);
      expect(await auditsOf(target.destinationId)).toContainEqual({
        action: 'destination.marked_published',
        actor_kind: 'user',
        outcome: 'ok',
        error_code: null,
        args_summary: {
          fromState: state,
          fromReason: state === 'unconfirmed' ? 'ambiguous_response' : null,
        },
      });
    },
  );

  it('refuses a failed destination and a stale version', async () => {
    const failed = await postIn('failed');
    const refused = await act(failed, 'mark-published');
    expect(refused.status).toBe(409);
    expect((await errorOf(refused)).code).toBe('conflict');

    const unconfirmed = await postIn('unconfirmed');
    const stale = await act(unconfirmed, 'mark-published', {
      expectedVersion: unconfirmed.version - 1,
    });
    expect(stale.status).toBe(409);
    expect((await destinationRow(unconfirmed.destinationId)).state).toBe('unconfirmed');
  });

  it('answers 404 for a destination of another post', async () => {
    const one = await postIn('unconfirmed');
    const other = await postIn('unconfirmed');
    const response = await act({ ...one, publicId: other.publicId }, 'mark-published');
    expect(response.status).toBe(404);
  });
});

describe('destinations.send_again', () => {
  it('schedules a failed destination again and enqueues it', async () => {
    const target = await postIn('failed');
    const scheduleLocal = inMinutes(300);
    const post = await ok(
      await act(target, 'send-again', { mode: 'instant', scheduleLocal, scheduleTz: TZ }),
    );
    expect(post.destinations[0]?.state).toBe('scheduled');
    const row = await destinationRow(target.destinationId);
    const at = instantOf(scheduleLocal);
    expect(row.run_at).toEqual(at);
    expect(row.deadline_at).toEqual(new Date(at.getTime() + 6 * 3600 * 1000));
    expect(row).toMatchObject({ state_reason: null, attempt_count: 0, last_error_code: null });
    expect(await jobRunAt(target.destinationId)).toEqual(at);
    expect(await auditsOf(target.destinationId)).toContainEqual(
      expect.objectContaining({
        action: 'destination.resent',
        args_summary: { fromState: 'failed', fromReason: 'permanent_error' },
      }),
    );
  });

  it('refuses an unconfirmed destination without the duplicate acknowledgement', async () => {
    const target = await postIn('unconfirmed');
    const response = await act(target, 'send-again', { mode: 'asap' });
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.acknowledgeDuplicate', code: 'duplicate_risk' },
    ]);
    const row = await destinationRow(target.destinationId);
    expect(row).toMatchObject({ state: 'unconfirmed', version: target.version });
    expect(await auditsOf(target.destinationId)).toEqual([]);
  });

  it('sends an unconfirmed destination again once acknowledged, keeping confirmed parts', async () => {
    const target = await postIn('unconfirmed');
    await seedItems(target, ['confirmed', 'failed']);
    const post = await ok(
      await act(target, 'send-again', { mode: 'asap', acknowledgeDuplicate: true }),
    );
    expect(post.destinations[0]?.state).toBe('scheduled');
    expect(await itemsOf(target)).toEqual([
      { position: 0, state: 'confirmed', remote_id: 'r-0' },
      { position: 1, state: 'pending', remote_id: null },
    ]);
  });

  it('asks for the duplicate acknowledgement when a failed destination has a part in flight', async () => {
    const target = await postIn('failed');
    await seedItems(target, ['confirmed', 'sending']);
    const refused = await act(target, 'send-again', { mode: 'asap' });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).details).toEqual([
      { path: 'body.acknowledgeDuplicate', code: 'duplicate_risk' },
    ]);
    expect((await destinationRow(target.destinationId)).state).toBe('failed');
    await ok(await act(target, 'send-again', { mode: 'asap', acknowledgeDuplicate: true }));
    expect((await destinationRow(target.destinationId)).state).toBe('scheduled');
  });

  it('sends a blocked destination again and refuses a published one', async () => {
    const blocked = await postIn('blocked');
    await ok(await act(blocked, 'send-again', { mode: 'asap' }));
    expect((await destinationRow(blocked.destinationId)).state).toBe('scheduled');

    const published = await postIn('published');
    const refused = await act(published, 'send-again', { mode: 'asap' });
    expect(refused.status).toBe(409);
    expect((await destinationRow(published.destinationId)).state).toBe('published');
  });
});

describe('destinations.cancel', () => {
  it.each([
    ['failed', 'user_canceled', 'permanent_error'],
    ['awaiting_manual', 'skipped_manual', null],
  ] as const)('cancels a %s destination as %s', async (state, reason, fromReason) => {
    const target = await postIn(state);
    const post = await ok(await act(target, 'cancel'));
    expect(post.destinations[0]).toMatchObject({ state: 'canceled', stateReason: reason });
    expect(await jobRunAt(target.destinationId)).toBeUndefined();
    expect(await auditsOf(target.destinationId)).toContainEqual({
      action: 'destination.canceled',
      actor_kind: 'user',
      outcome: 'ok',
      error_code: reason,
      args_summary: { fromState: state, fromReason },
    });
  });

  it('refuses an unconfirmed destination', async () => {
    const target = await postIn('unconfirmed');
    const response = await act(target, 'cancel');
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('conflict');
    expect((await destinationRow(target.destinationId)).state).toBe('unconfirmed');
  });
});

describe('authorization', () => {
  it('refuses a grant without posts:schedule or posts:cancel', async () => {
    const readOnly = await insertGrant({ scopes: ['posts:read'] });
    const unconfirmed = await postIn('unconfirmed');
    const failed = await postIn('failed');
    expect((await act(failed, 'send-again', { mode: 'asap' }, readOnly)).status).toBe(403);
    expect((await act(failed, 'cancel', {}, grantAuth)).status).toBe(403);
    expect((await destinationRow(failed.destinationId)).state).toBe('failed');
    expect((await destinationRow(unconfirmed.destinationId)).state).toBe('unconfirmed');
  });

  it('lets only a signed-in user mark a destination published', async () => {
    const unconfirmed = await postIn('unconfirmed');
    expect((await act(unconfirmed, 'mark-published', {}, grantAuth)).status).toBe(401);
    expect((await destinationRow(unconfirmed.destinationId)).state).toBe('unconfirmed');
  });
});

describe('a destination with a live part', () => {
  function setDestination(target: InState, assignments: ReturnType<typeof sql>) {
    return owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set ${assignments} where id = ${target.destinationId}`.execute(
        trx,
      ),
    );
  }

  it('refuses to unschedule a chain whose main post is live', async () => {
    const target = await postIn('chain_next');
    await seedItems(target, ['confirmed', 'pending']);
    const response = await call('POST', `posts/${target.post.id}/unschedule`, ownerAuth, {
      expectedVersion: target.post.version,
    });
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('destination_live');
    expect((await destinationRow(target.destinationId)).state).toBe('retry_wait');
    expect((await itemsOf(target)).map((item) => item.state)).toEqual(['confirmed', 'pending']);
  });

  it('cancels an incomplete chain but refuses to thaw it on edit', async () => {
    const target = await postIn('failed');
    await setDestination(target, sql`state_reason = 'thread_incomplete'`);
    await seedItems(target, ['confirmed', 'failed', 'pending']);
    const canceled = await ok(await act(target, 'cancel'));
    expect(canceled.destinations[0]?.state).toBe('canceled');
    expect((await itemsOf(target)).map((item) => item.state)).toEqual([
      'confirmed',
      'failed',
      'skipped',
    ]);
    const edit = await call('PATCH', `posts/${target.post.id}`, ownerAuth, {
      expectedVersion: canceled.version,
      destinations: [{ accountId: accountA, publishType: 'post' }],
    });
    expect(edit.status).toBe(409);
    expect((await errorOf(edit)).code).toBe('destination_live');
    expect((await destinationRow(target.destinationId)).state).toBe('canceled');
    expect(await itemsOf(target)).toHaveLength(3);
  });

  it('marks a chain published by hand, skipping open parts and keeping the main publish time', async () => {
    const target = await postIn('unconfirmed');
    await setDestination(target, sql`published_at = '2026-10-01T08:00:00Z'`);
    await seedItems(target, ['confirmed', 'sending', 'pending']);
    await ok(await act(target, 'mark-published'));
    expect((await itemsOf(target)).map((item) => item.state)).toEqual([
      'confirmed',
      'skipped',
      'skipped',
    ]);
    expect((await destinationRow(target.destinationId)).published_at).toEqual(
      new Date('2026-10-01T08:00:00Z'),
    );
  });
});
