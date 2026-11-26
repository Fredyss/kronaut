import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { purgeWebhookEvents, WEBHOOK_RETENTION_DAYS } from './retention.ts';
import { callHooks, type HookFixture, SYSTEM, startHooks, stopHooks } from './testing.ts';

let test: TestDatabase;
let fixture: HookFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startHooks(test);
});

afterAll(async () => {
  await stopHooks(fixture);
  await test?.stop();
});

async function testEvents(count: number): Promise<string[]> {
  const owner = { cookie: fixture.cookies.owner };
  const created = await callHooks(fixture, owner, {
    method: 'POST',
    body: { url: 'https://hooks.example.test/in', events: ['post.completed'] },
  });
  const ids: string[] = [];
  for (let n = 0; n < count; n++) {
    const sent = await callHooks(fixture, owner, {
      method: 'POST',
      path: `/${String(created.json?.id)}/test`,
    });
    ids.push(String(sent.json?.eventId));
  }
  return ids;
}

function remaining(table: 'webhook_events' | 'webhook_deliveries') {
  return fixture.root.withActor(SYSTEM, async (trx) => {
    const rows = await trx
      .selectFrom(table)
      .select(table === 'webhook_events' ? 'id' : 'event_id as id')
      .execute();
    return rows.map((row) => row.id).sort();
  });
}

describe('webhook retention', () => {
  it(`deletes events older than ${WEBHOOK_RETENTION_DAYS} days with their deliveries, in batches`, async () => {
    const [old1, old2, fresh] = await testEvents(3);
    await fixture.root.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('webhook_events')
        .set({
          occurred_at: sql<Date>`now() - make_interval(days => ${WEBHOOK_RETENTION_DAYS}, secs => 1)`,
        })
        .where('id', 'in', [old1 ?? '', old2 ?? ''])
        .execute(),
    );
    const detail = await purgeWebhookEvents(fixture, 1);
    expect(JSON.parse(detail)).toMatchObject({ events: 2, failed: 0 });
    expect(await remaining('webhook_events')).toEqual([fresh]);
    expect(await remaining('webhook_deliveries')).toEqual([fresh]);
  });
});
