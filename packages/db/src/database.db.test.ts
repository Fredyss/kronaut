import { sql } from 'kysely';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from './actor.ts';
import { createDatabase, type Database } from './database.ts';
import { startTestDatabase, type TestDatabase } from './testing.ts';

interface Tenant {
  userId: string;
  organizationId: string;
  workspaceId: string;
}

let test: TestDatabase;
let db: Database;
let single: Database;
let a: Tenant;
let b: Tenant;
let brandA: string;

const SYSTEM: Actor = { kind: 'system' };

async function provision(label: string): Promise<Tenant> {
  const userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                              ${`User ${label}`}, 'hash', 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  return await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ organization_id: string; workspace_id: string }>`
      select organization_id, workspace_id
        from provision_organization(${`Org ${label}`}, ${`Workspace ${label}`}, ${`ws-${label}`}, 'Europe/Bratislava')
    `.execute(trx);
    const row = result.rows[0];
    if (!row) throw new Error('provision_organization returned no row');
    return { userId, organizationId: row.organization_id, workspaceId: row.workspace_id };
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl, applicationName: 'kronaut-db-test' });
  single = createDatabase({ connectionString: test.appUrl, maxConnections: 1 });
  a = await provision('a');
  b = await provision('b');
  brandA = await db.withTenant(a.workspaceId, { kind: 'user', id: a.userId }, async (trx) => {
    const row = await trx
      .insertInto('brands')
      .values({ workspace_id: a.workspaceId, name: 'Brand A', slug: 'brand-a' })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
});

afterAll(async () => {
  await db?.destroy();
  await single?.destroy();
  await test?.stop();
});

describe('tenant scoping', () => {
  it('fails a tenant-table query made outside withTenant', async () => {
    const client = new pg.Client({ connectionString: test.appUrl });
    await client.connect();
    try {
      await expect(client.query('select * from brands')).rejects.toThrow();
    } finally {
      await client.end();
    }
    await expect(
      db.withActor(SYSTEM, (trx) => trx.selectFrom('brands').selectAll().execute()),
    ).rejects.toThrow();
  });

  it('sets app_workspace_id() and app_actor() for the transaction', async () => {
    const actor: Actor = { kind: 'user', id: a.userId };
    const row = await db.withTenant(a.workspaceId.toUpperCase(), actor, async (trx) => {
      const result = await sql<{ workspace: string; actor: string }>`
        select app_workspace_id() as workspace, app_actor() as actor
      `.execute(trx);
      return result.rows[0];
    });
    expect(row).toEqual({ workspace: a.workspaceId, actor: `user:${a.userId}` });
  });

  it('withActor leaves the workspace unset', async () => {
    const row = await db.withActor({ kind: 'cli' }, async (trx) => {
      const result = await sql<{ actor: string; workspace: string | null }>`
        select app_actor() as actor, current_setting('app.workspace_id', true) as workspace
      `.execute(trx);
      return result.rows[0];
    });
    expect(row?.actor).toBe('cli');
    expect(row?.workspace ?? '').toBe('');
  });

  it('does not leak settings to the next transaction on the same connection', async () => {
    await single.withTenant(a.workspaceId, SYSTEM, async () => {});
    await expect(
      single.withActor(SYSTEM, (trx) => trx.selectFrom('brands').selectAll().execute()),
    ).rejects.toThrow();
    const actor = await single.withActor(SYSTEM, async (trx) => {
      const result = await sql<{ actor: string }>`select app_actor() as actor`.execute(trx);
      return result.rows[0]?.actor;
    });
    expect(actor).toBe('system');
  });

  it('rolls back when the callback throws', async () => {
    const actor: Actor = { kind: 'user', id: a.userId };
    await expect(
      db.withTenant(a.workspaceId, actor, async (trx) => {
        await trx
          .insertInto('brands')
          .values({ workspace_id: a.workspaceId, name: 'Doomed', slug: 'doomed' })
          .execute();
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    const rows = await db.withTenant(a.workspaceId, actor, (trx) =>
      trx.selectFrom('brands').select('slug').where('slug', '=', 'doomed').execute(),
    );
    expect(rows).toEqual([]);
  });

  it('hides a brand from another workspace', async () => {
    const seenByA = await db.withTenant(a.workspaceId, { kind: 'user', id: a.userId }, (trx) =>
      trx.selectFrom('brands').select('id').execute(),
    );
    expect(seenByA.map((row) => row.id)).toContain(brandA);

    const seenByB = await db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
      trx.selectFrom('brands').select('id').where('id', '=', brandA).execute(),
    );
    expect(seenByB).toEqual([]);
  });

  it('rejects a cross-tenant reference with a foreign key violation', async () => {
    await expect(
      db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
        trx
          .insertInto('locations')
          .values({ workspace_id: b.workspaceId, brand_id: brandA, name: 'Stolen' })
          .execute(),
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('rejects writing a row into another workspace', async () => {
    await expect(
      db.withTenant(b.workspaceId, { kind: 'user', id: b.userId }, (trx) =>
        trx
          .insertInto('brands')
          .values({ workspace_id: a.workspaceId, name: 'Injected', slug: 'injected' })
          .execute(),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('rejects a non-uuid workspace id', async () => {
    await expect(db.withTenant('nope', SYSTEM, async () => {})).rejects.toThrow(TypeError);
  });
});

describe('type parsing', () => {
  it('returns timestamp and date as raw strings and timestamptz as Date', async () => {
    const actor: Actor = { kind: 'user', id: a.userId };
    const previousTz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const { post, campaign } = await db.withTenant(a.workspaceId, actor, async (trx) => {
        const post = await trx
          .insertInto('posts')
          .values({
            workspace_id: a.workspaceId,
            origin: 'ui',
            schedule_mode: 'local_per_destination',
            schedule_local: '2026-03-29 02:30:00',
            schedule_tz: 'Europe/Bratislava',
          })
          .returning(['schedule_local', 'created_at'])
          .executeTakeFirstOrThrow();
        const campaign = await trx
          .insertInto('campaigns')
          .values({ workspace_id: a.workspaceId, name: 'Spring', starts_on: '2026-03-29' })
          .returning(['starts_on', 'created_at'])
          .executeTakeFirstOrThrow();
        return { post, campaign };
      });
      expect(post.schedule_local).toBe('2026-03-29 02:30:00');
      expect(campaign.starts_on).toBe('2026-03-29');
      expect(post.created_at).toBeInstanceOf(Date);
      expect(campaign.created_at).toBeInstanceOf(Date);
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });

  it('returns bigint columns as strings', async () => {
    const actor: Actor = { kind: 'user', id: a.userId };
    const row = await db.withTenant(a.workspaceId, actor, async (trx) =>
      trx
        .insertInto('usage_counters')
        .values({
          organization_id: a.organizationId,
          metric: 'posts.published',
          period_start: '2026-03-01',
          count: '9007199254740993',
        })
        .returning(['count', 'period_start'])
        .executeTakeFirstOrThrow(),
    );
    expect(row.count).toBe('9007199254740993');
    expect(row.period_start).toBe('2026-03-01');
  });
});

describe('sweeps', () => {
  const calls = [
    ['dueDestinations', (limit?: number) => db.sweeps.dueDestinations(limit)],
    ['expiredLeases', (limit?: number) => db.sweeps.expiredLeases(limit)],
    ['verifyingDestinations', (limit?: number) => db.sweeps.verifyingDestinations(limit)],
    ['quarantineDestinations', (limit?: number) => db.sweeps.quarantineDestinations(limit)],
    ['expiringCredentials', (limit?: number) => db.sweeps.expiringCredentials(3600, limit)],
  ] as const;

  for (const [name, call] of calls) {
    it(`${name} returns an array and enforces the limit range`, async () => {
      const rows = await call();
      expect(Array.isArray(rows)).toBe(true);
      expect(await call(1)).toEqual(expect.any(Array));
      expect(await call(1000)).toEqual(expect.any(Array));
      await expect(call(0)).rejects.toThrow(RangeError);
      await expect(call(1001)).rejects.toThrow(RangeError);
    });
  }

  it('maps definer function rows to workspaceId and id', async () => {
    const due = '00000000-0000-7000-8000-000000000211';
    const leased = '00000000-0000-7000-8000-000000000221';
    const owner = new pg.Client({ connectionString: test.ownerUrl });
    await owner.connect();
    try {
      await owner.query('set session_replication_role = replica');
      const insert = `
        insert into post_destinations (workspace_id, id, post_id, social_account_id, provider, publish_type,
          selection_source, account_label, state, version, frozen_at, frozen_post_version, content_hash,
          content_hash_v, scheduled_local, scheduled_tz, scheduled_at, deadline_at, run_at, lease_until,
          claimed_attempt_id, scheduled_by_user_id)
        values ($1, $2, gen_random_uuid(), gen_random_uuid(), 'bluesky', 'post', 'manual', 'A', $3, 2, now(), 1,
          decode(repeat('aa', 32), 'hex'), 1, '2026-11-02 09:00', 'Europe/Bratislava', now() - interval '3 hours',
          now() + interval '3 hours', $4, $5, $6, gen_random_uuid())`;
      await owner.query(insert, [
        a.workspaceId,
        due,
        'scheduled',
        new Date(Date.now() - 3 * 3_600_000),
        null,
        null,
      ]);
      await owner.query(insert, [
        a.workspaceId,
        leased,
        'publishing',
        null,
        new Date(Date.now() - 600_000),
        '00000000-0000-7000-8000-0000000000f1',
      ]);
    } finally {
      await owner.end();
    }

    expect(await db.sweeps.dueDestinations()).toEqual([{ workspaceId: a.workspaceId, id: due }]);
    expect(await db.sweeps.expiredLeases(10)).toEqual([{ workspaceId: a.workspaceId, id: leased }]);
    expect(await db.sweeps.verifyingDestinations()).toEqual([]);
    expect(await db.sweeps.quarantineDestinations()).toEqual([]);
    expect(await db.sweeps.expiringCredentials(86_400)).toEqual([]);
  });
});
