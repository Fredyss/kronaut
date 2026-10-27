import { randomBytes, randomUUID } from 'node:crypto';
import { WEBHOOK_API_VERSION } from '@kronaut/contract';
import type { Actor, Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reapLeases } from '../publish/sweeps.ts';
import { runPublish } from '../publish/task.ts';
import {
  type PublishFixture,
  SEED_TEXT,
  type Seeded,
  startPublishFixture,
} from '../publish/testing.ts';
import { runVerify } from '../publish/verify.ts';
import { destinationEvent, writeWebhookEvent } from './events.ts';

const SYSTEM: Actor = { kind: 'system' };

let test: TestDatabase;
let fixture: PublishFixture;
let owner: Database;
let workspaceId: string;
let subscribed: string;

function publish(seeded: Seeded): Promise<void> {
  return runPublish(fixture.deps, { workspaceId, id: seeded.destinationId });
}

async function endpoint(events: string[], enabled: boolean): Promise<string> {
  return await fixture.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const { id } = await trx
      .insertInto('webhook_endpoints')
      .values({
        workspace_id: workspaceId,
        url: 'https://hooks.example.test/in',
        events,
        enabled,
        secret_ciphertext: randomBytes(32),
        secret_nonce: randomBytes(12),
        secret_wrapped_dek: randomBytes(40),
        kek_version: 1,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return id;
  });
}

function events(where: { subjectId?: string; type?: string }) {
  return owner.withActor(SYSTEM, (trx) => {
    let query = trx
      .selectFrom('webhook_events')
      .select([
        'id',
        'type',
        'dedupe_key',
        'subject_id',
        'sequence',
        'payload',
        sql<boolean>`(payload->>'created_at')::timestamptz = occurred_at`.as('created_at_matches'),
      ])
      .where('workspace_id', '=', workspaceId);
    if (where.subjectId !== undefined) query = query.where('subject_id', '=', where.subjectId);
    if (where.type !== undefined) query = query.where('type', '=', where.type);
    return query.orderBy('occurred_at').orderBy('id').execute();
  });
}

function deliveries(eventId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_deliveries')
      .select(['endpoint_id', 'state'])
      .where('event_id', '=', eventId)
      .execute(),
  );
}

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-webhooks');
  ({ owner, workspaceId } = fixture);
  subscribed = await endpoint(['destination.published', 'post.completed'], true);
  await endpoint(['destination.published', 'post.completed'], false);
  await endpoint(['channel.needs_reauth'], true);
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

describe('webhook events', () => {
  it('writes the destination and post events of a publish with deliveries', async () => {
    const seeded = await fixture.seed();
    fixture.fake.script({ kind: 'publish', remoteId: 'r-1', url: 'https://fake.example.test/r-1' });
    await publish(seeded);
    const { attemptId, version } = await owner.withActor(SYSTEM, async (trx) => ({
      attemptId: (
        await trx
          .selectFrom('publish_attempts')
          .select('id')
          .where('destination_id', '=', seeded.destinationId)
          .executeTakeFirstOrThrow()
      ).id,
      version: (
        await trx
          .selectFrom('post_destinations')
          .select('version')
          .where('id', '=', seeded.destinationId)
          .executeTakeFirstOrThrow()
      ).version,
    }));

    const [event, ...rest] = await events({ subjectId: seeded.destinationId });
    expect(rest).toHaveLength(0);
    expect(event).toMatchObject({
      type: 'destination.published',
      dedupe_key: `destination.${seeded.destinationId}.${version}`,
      sequence: version,
      created_at_matches: true,
    });
    expect(event?.payload).toEqual({
      id: event?.id,
      type: 'destination.published',
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
      api_version: WEBHOOK_API_VERSION,
      workspace_id: workspaceId,
      data: {
        destination_id: seeded.destinationId,
        post_id: seeded.postId,
        post_version: 1,
        social_account_id: seeded.accountId,
        provider: 'fake',
        state: 'published',
        reason: null,
        remote_id: 'r-1',
        remote_url: 'https://fake.example.test/r-1',
        attempt_id: attemptId,
      },
    });
    expect(await deliveries(event?.id ?? '')).toEqual([
      { endpoint_id: subscribed, state: 'pending' },
    ]);

    const [completed, ...more] = await events({ subjectId: seeded.postId });
    expect(more).toHaveLength(0);
    expect(completed).toMatchObject({
      type: 'post.completed',
      dedupe_key: `post.completed.${seeded.postId}.1`,
      sequence: 1,
      payload: {
        data: {
          post_id: seeded.postId,
          summary: 'completed_all',
          published: 1,
          failed: 0,
          canceled: 0,
        },
      },
    });
  });

  it('publishes with an oversized remote id and url, leaving them null in the event', async () => {
    const seeded = await fixture.seed();
    const remoteId = 'r'.repeat(20_000);
    fixture.fake.script({
      kind: 'publish',
      remoteId,
      url: `https://fake.example.test/${remoteId}`,
    });

    await publish(seeded);

    const row = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_destinations')
        .select(['state', 'remote_id'])
        .where('id', '=', seeded.destinationId)
        .executeTakeFirstOrThrow(),
    );
    expect(row).toEqual({ state: 'published', remote_id: remoteId });
    const [event] = await events({ subjectId: seeded.destinationId });
    expect(event?.payload).toMatchObject({
      type: 'destination.published',
      data: { remote_id: null, remote_url: null },
    });
  });

  it('writes one event and one delivery for a repeated dedupe key', async () => {
    const id = randomUUID();
    const input = destinationEvent(workspaceId, 3, {
      destination_id: id,
      post_id: randomUUID(),
      post_version: 1,
      social_account_id: randomUUID(),
      provider: 'fake',
      state: 'published',
      reason: null,
      remote_id: 'r-dup',
      remote_url: null,
      attempt_id: null,
    });
    const written = await fixture.db.withTenant(workspaceId, SYSTEM, async (trx) => [
      await writeWebhookEvent(trx, input),
      await writeWebhookEvent(trx, input),
    ]);
    expect(written).toEqual([true, false]);
    const [event, ...rest] = await events({ subjectId: id });
    expect(rest).toHaveLength(0);
    expect(await deliveries(event?.id ?? '')).toHaveLength(1);
  });

  it('writes a claim-time block without an attempt id', async () => {
    const seeded = await fixture.seed();
    await owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('social_accounts')
        .set({ status: 'needs_reauth' })
        .where('id', '=', seeded.accountId)
        .execute(),
    );
    await publish(seeded);
    const [event] = await events({ subjectId: seeded.destinationId });
    expect(event).toMatchObject({
      type: 'destination.blocked',
      payload: { data: { state: 'blocked', reason: 'account_needs_reauth', attempt_id: null } },
    });
  });

  it('writes channel.needs_reauth once for an account two destinations fail on', async () => {
    const first = await fixture.seed();
    const second = await fixture.seed({ accountId: first.accountId });
    const update = (assignments: ReturnType<typeof sql>) =>
      owner.withActor(SYSTEM, (trx) =>
        sql`update post_destinations set ${assignments} where id = ${first.destinationId}`.execute(
          trx,
        ),
      );
    fixture.fake.script(
      {
        kind: 'fail',
        error: { kind: 'auth_revoked' },
        at: 'after_public',
        afterPublic: async () => {
          await update(sql`lease_until = now() - interval '60 seconds'`);
          await reapLeases(fixture.deps);
          await publish(second);
        },
      },
      { kind: 'fail', error: { kind: 'auth_revoked' }, at: 'before_public' },
    );
    await publish(first);
    await update(sql`run_at = now() - interval '1 second'`);
    await runVerify(fixture.deps, { workspaceId, id: first.destinationId });
    const states = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('post_destinations')
        .select('state')
        .where('id', 'in', [first.destinationId, second.destinationId])
        .orderBy('state')
        .execute(),
    );
    expect(states.map((row) => row.state)).toEqual(['blocked', 'unconfirmed']);
    const reauth = await events({ subjectId: first.accountId });
    expect(reauth).toHaveLength(1);
    expect(reauth[0]).toMatchObject({
      type: 'channel.needs_reauth',
      payload: {
        data: { social_account_id: first.accountId, provider: 'fake', reason: 'auth_revoked' },
      },
    });
    expect(reauth[0]?.dedupe_key).toMatch(
      new RegExp(`^channel\\.needs_reauth\\.${first.accountId}\\.\\d{4}-`),
    );
  });

  it('writes provider_app.misconfigured in the workspace whose job flipped the app', async () => {
    const app = await fixture.createApp('fake-client-broken');
    const seeded = await fixture.seed({ appId: app });
    fixture.fake.script({
      kind: 'fail',
      error: { kind: 'app_config', code: 'bad_client' },
      at: 'before_public',
    });
    await publish(seeded);
    const incident = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('provider_app_incidents')
        .select('id')
        .where('provider_app_id', '=', app)
        .executeTakeFirstOrThrow(),
    );
    const [event, ...rest] = await events({ subjectId: app });
    expect(rest).toHaveLength(0);
    expect(event).toMatchObject({
      type: 'provider_app.misconfigured',
      dedupe_key: `provider_app.misconfigured.${app}.${incident.id}`,
      payload: {
        workspace_id: workspaceId,
        data: { provider_app_id: app, provider: 'fake', code: 'bad_client' },
      },
    });
  });

  it('never puts post text in a payload', async () => {
    const written = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select(sql<string>`payload::text`.as('text'))
        .where('workspace_id', '=', workspaceId)
        .execute(),
    );
    expect(written.length).toBeGreaterThan(5);
    for (const row of written) expect(row.text).not.toContain(SEED_TEXT);
  });
});
