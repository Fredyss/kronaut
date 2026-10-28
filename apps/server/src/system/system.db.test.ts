import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, type Member } from '../approvals/testing.ts';
import { CRON_TASKS } from '../cron.ts';
import {
  accountA,
  accountB,
  call,
  create,
  doc,
  grantAuth,
  owner,
  ownerAuth,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  workspaceId,
} from '../posts/testing.ts';
import { FAKE_PROVIDER } from '../publish/testing.ts';

interface CronDto {
  readonly task: string;
  readonly startedAt: string | null;
  readonly outcome: string | null;
  readonly detail: string | null;
  readonly stale: boolean;
}

interface StatusDto {
  readonly slo: { day: Record<string, number | null>; week: Record<string, number | null> };
  readonly cron: CronDto[];
  readonly incidents: Record<string, unknown>[];
  readonly apiVersions: { provider: string; level: string }[];
}

let test: TestDatabase;
let editor: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  editor = await addMember('editor', false);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function status(): Promise<StatusDto> {
  const response = await call('GET', 'system', ownerAuth);
  expect(response.status).toBe(200);
  return (await response.json()) as StatusDto;
}

async function attempt(destinationId: string, attemptNo: number, position: number) {
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('publish_attempts')
      .values({
        workspace_id: workspaceId,
        destination_id: destinationId,
        attempt_no: attemptNo,
        kind: 'publish',
        worker_id: 'w',
        post_version: 1,
        finished_at: sql<Date>`now()`,
        outcome: 'ok',
        item_position: position,
      })
      .execute(),
  );
}

async function pastDestinations(): Promise<string[]> {
  const post = await scheduled(
    await create(ownerAuth, {
      items: [{ doc: doc('Ahoj') }],
      destinations: [
        { accountId: accountA, publishType: 'post' },
        { accountId: accountB, publishType: 'post' },
      ],
    }),
  );
  const ids = post.destinations.map((d) => decodePublicId('destination', d.id) ?? '');
  await owner.withActor(SYSTEM, async (trx) => {
    await sql`set local session_replication_role = replica`.execute(trx);
    await trx
      .updateTable('post_destinations')
      .set({ scheduled_at: sql<Date>`now() - interval '1 hour'` })
      .where('id', 'in', ids)
      .execute();
  });
  return ids;
}

async function cronRun(task: string, ago: string, outcome: 'ok' | 'error', detail: string) {
  await owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('cron_runs')
      .values({
        task,
        started_at: sql<Date>`now() - ${ago}::interval`,
        finished_at: sql<Date>`now() - ${ago}::interval`,
        outcome,
        detail,
      })
      .execute(),
  );
}

describe('system.status', () => {
  it('is for owners only, never an editor or an API key', async () => {
    const body = await status();
    expect(body.apiVersions).toEqual([expect.objectContaining({ provider: FAKE_PROVIDER })]);
    expect((await call('GET', 'system', editor.auth)).status).toBe(403);
    expect((await call('GET', 'system', grantAuth)).status).toBe(401);
  });

  it('counts two ok attempts at one position as a duplicate, not two positions', async () => {
    const [duplicate, chain] = await pastDestinations();
    await attempt(duplicate ?? '', 1, 0);
    await attempt(duplicate ?? '', 2, 0);
    await attempt(chain ?? '', 1, 0);
    await attempt(chain ?? '', 2, 1);
    const { slo } = await status();
    expect(slo.day).toMatchObject({ autoTotal: 2, duplicates: 1, unconfirmedPct: 0 });
    expect(slo.week).toMatchObject({ autoTotal: 2, duplicates: 1 });
  });

  it('shows the last run per task and marks old or missing runs stale', async () => {
    await cronRun(CRON_TASKS.publishDueSweep, '1 hour', 'error', 'old failure');
    await cronRun(CRON_TASKS.publishDueSweep, '10 seconds', 'ok', '{}');
    await cronRun(CRON_TASKS.mediaGc, '3 hours', 'error', 'boom');
    const cron = new Map((await status()).cron.map((row) => [row.task, row]));
    expect(cron.get(CRON_TASKS.publishDueSweep)).toMatchObject({
      outcome: 'ok',
      detail: null,
      stale: false,
    });
    expect(cron.get(CRON_TASKS.mediaGc)).toMatchObject({
      outcome: 'error',
      detail: 'boom',
      stale: true,
    });
    expect(cron.get(CRON_TASKS.apiVersionSunset)).toMatchObject({ startedAt: null, stale: true });
  });

  it('lists incidents with the provider but never the app id', async () => {
    await owner.withActor(SYSTEM, async (trx) => {
      const app = await trx
        .selectFrom('provider_apps')
        .select('id')
        .where('provider', '=', FAKE_PROVIDER)
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('provider_app_incidents')
        .values({ provider_app_id: app.id, kind: 'provider_outage' })
        .execute();
    });
    const [incident] = (await status()).incidents;
    expect(incident).toMatchObject({ provider: FAKE_PROVIDER, kind: 'provider_outage' });
    expect(Object.keys(incident ?? {}).sort()).toEqual([
      'detailCode',
      'kind',
      'lastSeenAt',
      'occurrences',
      'openedAt',
      'provider',
      'resolvedAt',
    ]);
  });
});
