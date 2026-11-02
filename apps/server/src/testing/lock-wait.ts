import type { Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { expect, vi } from 'vitest';

const SYSTEM = { kind: 'system' } as const;

function lockWaiters(db: Database): Promise<number> {
  return db.withActor(SYSTEM, async (trx) => {
    const { rows } = await sql<{ count: number }>`
      select count(*)::int as count from pg_stat_activity where wait_event_type = 'Lock'
    `.execute(trx);
    return rows[0]?.count ?? 0;
  });
}

export function advisoryLock(key: string) {
  return (trx: TenantDb) =>
    sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`.execute(trx);
}

export async function whileHeld(
  db: Database,
  hold: (trx: TenantDb) => Promise<unknown>,
  request: () => Promise<Response>,
): Promise<Response> {
  const [pending] = await db.withActor(SYSTEM, async (trx) => {
    await hold(trx);
    const calls = [request()];
    await vi.waitFor(async () => expect(await lockWaiters(db)).toBeGreaterThan(0), {
      timeout: 10_000,
      interval: 25,
    });
    return calls;
  });
  if (pending === undefined) throw new Error('no request');
  return await pending;
}
