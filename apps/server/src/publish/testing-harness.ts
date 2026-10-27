import { createHash, randomUUID } from 'node:crypto';
import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import { type PublishDeps, runPublish } from './task.ts';
import {
  type FakeProvider,
  type FixtureUrls,
  type PublishFixture,
  SEED_TEXT,
  type Seeded,
  type SeedOptions,
  startPublishFixture,
} from './testing.ts';

export const SYSTEM: Actor = { kind: 'system' };
export const CLI: Actor = { kind: 'cli' };
export const TEXT = SEED_TEXT;
const MIN_EXPIRED_SECONDS = 60;

export let fixture: PublishFixture;
export let owner: Database;
export let db: Database;
export let keyring: Keyring;
export let fake: FakeProvider;
export let deps: PublishDeps;
export let workspaceId: string;

export async function startHarness(test: FixtureUrls, slug: string): Promise<void> {
  fixture = await startPublishFixture(test, slug);
  ({ owner, db, keyring, fake, deps, workspaceId } = fixture);
}

export async function stopHarness(): Promise<void> {
  await fixture?.stop();
}

export const createUser = (label: string) => fixture.createUser(label);
export const createApp = (clientId: string) => fixture.createApp(clientId);
export const seed = (options?: SeedOptions) => fixture.seed(options);

export function publish(seeded: Seeded): Promise<void> {
  return runPublish(deps, { workspaceId, id: seeded.destinationId });
}

export function audits(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'error_code', 'correlation_id', 'actor_kind', 'surface', 'post_id'])
      .where('resource_id', '=', seeded.destinationId)
      .execute(),
  );
}

export async function jobRunAt(key: string): Promise<Date | undefined> {
  const result = await owner.withActor(CLI, (trx) =>
    sql<{ run_at: Date }>`select run_at from graphile_worker.jobs where key = ${key}`.execute(trx),
  );
  return result.rows[0]?.run_at;
}

export function queuedRunAt(seeded: Seeded): Promise<Date | undefined> {
  return jobRunAt(`dest:${seeded.destinationId}`);
}

export function verifyRunAt(seeded: Seeded): Promise<Date | undefined> {
  return jobRunAt(`verify:${seeded.destinationId}`);
}

export function updateDestination(seeded: Seeded, assignments: ReturnType<typeof sql>) {
  return owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set ${assignments} where id = ${seeded.destinationId}`.execute(
      trx,
    ),
  );
}

export async function strand(
  seeded: Seeded,
  options: {
    sent?: boolean;
    sentSecondsAgo?: number;
    attemptCount?: number;
    expiredSeconds?: number;
  } = {},
): Promise<string> {
  const attemptId = randomUUID();
  await updateDestination(
    seeded,
    sql`state = 'publishing', version = version + 1,
        lease_until = now() - make_interval(secs => ${options.expiredSeconds ?? MIN_EXPIRED_SECONDS}),
        claimed_attempt_id = ${attemptId}, attempt_count = ${options.attemptCount ?? 1}`,
  );
  await owner.withActor(SYSTEM, async (trx) => {
    await trx
      .insertInto('publish_attempts')
      .values({
        workspace_id: workspaceId,
        id: attemptId,
        destination_id: seeded.destinationId,
        attempt_no: 1,
        kind: 'publish',
        worker_id: 'dead-worker',
        post_version: 1,
        public_send_at:
          options.sent === true
            ? sql<Date>`now() - make_interval(secs => ${options.sentSecondsAgo ?? 0})`
            : null,
      })
      .execute();
    await trx
      .insertInto('destination_items')
      .values({
        workspace_id: workspaceId,
        destination_id: seeded.destinationId,
        position: 0,
        role: 'main',
        rendered_text: TEXT,
        rendered_sha256: createHash('sha256').update(TEXT).digest(),
        state: options.sent === true ? 'sending' : 'pending',
        send_started_at: options.sent === true ? sql<Date>`now()` : null,
      })
      .execute();
  });
  return attemptId;
}

export async function setPaused(paused: boolean): Promise<void> {
  await owner.withActor(CLI, (trx) =>
    paused
      ? sql`
          insert into instance_state (instance_id, publishing_paused, paused_reason)
          values (gen_random_uuid(), true, 'operator')
          on conflict (singleton) do update set publishing_paused = true, paused_reason = 'operator'
        `.execute(trx)
      : sql`update instance_state set publishing_paused = false, paused_reason = null`.execute(trx),
  );
}
