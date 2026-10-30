import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from './migrate.ts';
import { createDatabaseIn, query, recordThrough } from './migrate-testing.ts';

const TEST_DIR = join(import.meta.dirname, '..', 'test');
const LOCK_KEY = 0x6b726f6e617574n.toString();
const ALL = [
  '0001_v1',
  '0002_notification_email',
  '0003_notification_email_index',
  '0004_user_workspaces_can_approve',
  '0005_membership_email_muted',
  '0006_provider_app_redirect_uri',
  '0007_video_upload',
  '0008_media_frame_rate',
  '0009_reply_chains',
  '0010_media_ai_locked',
  '0011_slo_duplicates',
  '0012_meta_lifecycle',
  '0013_social_account_subject_index',
  '0014_queue_slots',
  '0015_post_series',
  '0016_post_series_index',
  '0017_evergreen',
  '0018_analytics',
  '0019_analytics_reach',
  '0020_approval_void_post_deleted',
  '0021_tags',
];

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
});

afterAll(async () => {
  await container.stop();
});

function freshDatabase(name: string): Promise<string> {
  return createDatabaseIn(container, name);
}

function withoutPsqlMetaCommands(script: string): string {
  const variables = new Map<string, string>();
  const kept: string[] = [];
  for (const line of script.split('\n')) {
    const assignment = /^\\set\s+(\w+)\s+'((?:[^']|'')*)'\s*$/.exec(line);
    if (assignment?.[1] !== undefined && assignment[2] !== undefined) {
      variables.set(assignment[1], assignment[2].replaceAll("''", "'"));
      continue;
    }
    if (!line.startsWith('\\')) kept.push(line);
  }
  return kept
    .join('\n')
    .replace(/(?<!:):([A-Z][A-Z0-9]*)\b/g, (match, name: string) => variables.get(name) ?? match);
}

async function runScript(connectionString: string, file: string): Promise<void> {
  const script = withoutPsqlMetaCommands(await readFile(join(TEST_DIR, file), 'utf8'));
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(script);
  } finally {
    await client.end();
  }
}

async function expectNotificationEmailSchema(url: string): Promise<void> {
  const [row] = await query<{ profiles: string; index: string | null; valid: boolean | null }>(
    url,
    `select pg_get_function_result('workspace_member_profiles()'::regprocedure) as profiles,
            pg_get_indexdef(to_regclass('public.ix_notifications_unemailed')) as index,
            (select i.indisvalid from pg_index i
              where i.indexrelid = to_regclass('public.ix_notifications_unemailed')) as valid`,
  );
  expect(row?.profiles).toBe(
    'TABLE(user_id uuid, display_name text, email text, role text, can_approve boolean, ui_locale text)',
  );
  expect(row?.index).toMatch(
    /ON public\.notifications USING btree \(workspace_id, created_at\) WHERE \(emailed_at IS NULL\)$/,
  );
  expect(row?.valid).toBe(true);
}

async function expectEmailMutedSchema(url: string): Promise<void> {
  const [row] = await query<{ type: string; fallback: string; valid: boolean | null }>(
    url,
    `select format_type(a.atttypid, a.atttypmod) as type, pg_get_expr(d.adbin, d.adrelid) as fallback,
            (select c.convalidated from pg_constraint c
              where c.conname = 'ck_memberships_email_muted') as valid
       from pg_attribute a join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = 'public.memberships'::regclass and a.attname = 'email_muted' and a.attnotnull`,
  );
  expect(row).toEqual({ type: 'text[]', fallback: "'{}'::text[]", valid: true });
}

describe('migrate', () => {
  it('applies every migration once and is a no-op afterwards', async () => {
    const url = await freshDatabase('applied_once');
    const messages: string[] = [];

    const first = await migrate({ connectionString: url, log: (msg) => messages.push(msg) });
    expect(first.applied).toEqual(ALL);
    expect(messages).toContain('applying 0001_v1');

    const second = await migrate({ connectionString: url });
    expect(second.applied).toEqual([]);

    const rows = await query<{ version: number; name: string; sha256: string }>(
      url,
      'select version, name, sha256 from kronaut_meta.migrations order by version',
    );
    expect(rows.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(rows[0]).toMatchObject({ version: 1, name: 'v1' });
    expect(rows[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('serialises concurrent runs behind the advisory lock, CONCURRENTLY index included', async () => {
    const url = await freshDatabase('concurrent');
    const results = await Promise.all([
      migrate({ connectionString: url }),
      migrate({ connectionString: url }),
      migrate({ connectionString: url }),
    ]);
    const applied = results.flatMap((result) => result.applied);
    expect(applied).toEqual(ALL);
    await expectNotificationEmailSchema(url);
  });

  it('lets runners waiting on the lock coexist with a CONCURRENTLY index build', async () => {
    const url = await freshDatabase('concurrent_v1_only');
    await recordThrough(url, 1);
    const results = await Promise.all([
      migrate({ connectionString: url }),
      migrate({ connectionString: url }),
    ]);
    expect(results.flatMap((result) => result.applied)).toEqual(ALL.slice(1));
    await expectNotificationEmailSchema(url);
  });

  it('refuses to run when a recorded checksum no longer matches', async () => {
    const url = await freshDatabase('tampered');
    await migrate({ connectionString: url });
    await query(
      url,
      "update kronaut_meta.migrations set sha256 = repeat('0', 64) where version = 1",
    );
    await expect(migrate({ connectionString: url })).rejects.toThrow(
      /changed after it was applied/,
    );
  });

  it('refuses to adopt a database that already holds the schema without a record', async () => {
    const url = await freshDatabase('unrecorded');
    await query(url, 'create table public.instance_state (id integer)');
    await expect(migrate({ connectionString: url })).rejects.toThrow(/instance_state/);
    const rows = await query<{ present: boolean }>(
      url,
      "select to_regclass('public.organizations') is not null as present",
    );
    expect(rows[0]?.present).toBe(false);
  });

  it('records the version in the same transaction as the schema', async () => {
    const url = await freshDatabase('atomic');
    await query(
      url,
      `create schema kronaut_meta;
       create table kronaut_meta.migrations (
         version integer primary key, name text not null, sha256 text not null,
         applied_at timestamptz not null default now());
       create function kronaut_meta.refuse() returns trigger language plpgsql
         as $$ begin raise exception 'bookkeeping refused'; end $$;
       create trigger refuse before insert on kronaut_meta.migrations
         for each row execute function kronaut_meta.refuse();`,
    );
    await expect(migrate({ connectionString: url })).rejects.toThrow(/bookkeeping refused/);
    const rows = await query<{ present: boolean }>(
      url,
      "select to_regclass('public.instance_state') is not null as present",
    );
    expect(rows[0]?.present).toBe(false);

    await query(url, 'drop trigger refuse on kronaut_meta.migrations');
    expect((await migrate({ connectionString: url })).applied).toEqual(ALL);
  });

  it('gives up on a blocked lock after the 3s lock_timeout instead of waiting forever', async () => {
    const url = await freshDatabase('lock_timeout');
    await migrate({ connectionString: url });
    const blocker = new pg.Client({ connectionString: url });
    await blocker.connect();
    try {
      await blocker.query('begin');
      await blocker.query('lock table kronaut_meta.migrations in access exclusive mode');
      const started = Date.now();
      await expect(migrate({ connectionString: url })).rejects.toThrow(/lock timeout/);
      const elapsed = Date.now() - started;
      expect(elapsed).toBeGreaterThanOrEqual(2_500);
      expect(elapsed).toBeLessThan(15_000);
    } finally {
      await blocker.query('rollback');
      await blocker.end();
    }
  });

  it('does not apply the lock_timeout to waiting for the advisory lock', async () => {
    const url = await freshDatabase('advisory_wait');
    const holder = new pg.Client({ connectionString: url });
    await holder.connect();
    try {
      await holder.query('select pg_advisory_lock($1::bigint)', [LOCK_KEY]);
      const pending = migrate({ connectionString: url });
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      await holder.query('select pg_advisory_unlock($1::bigint)', [LOCK_KEY]);
      expect((await pending).applied).toEqual(ALL);
    } finally {
      await holder.end();
    }
  });

  it('leaves bookkeeping unreachable for the application roles', async () => {
    const url = await freshDatabase('bookkeeping');
    await migrate({ connectionString: url });
    const rows = await query<{ app: boolean; operator: boolean }>(
      url,
      `select has_schema_privilege('kronaut_app', 'kronaut_meta', 'USAGE') as app,
              has_schema_privilege('kronaut_operator', 'kronaut_meta', 'USAGE') as operator`,
    );
    expect(rows[0]).toEqual({ app: false, operator: false });
  });

  it('settles the post summary when two destinations finish in concurrent transactions', async () => {
    const url = await freshDatabase('summary_race');
    await migrate({ connectionString: url });
    await runScript(url, 'publish-summary-race.sql');
    const finalize = async (client: pg.Client, id: string): Promise<void> => {
      await client.query(`update post_destinations
          set state = 'published', version = version + 1, lease_until = null, claimed_attempt_id = null,
              published_at = now(), resolution = 'api', remote_id = 'at://remote/' || id
        where id = '${id}'`);
    };
    const clients = [
      new pg.Client({ connectionString: url }),
      new pg.Client({ connectionString: url }),
    ];
    try {
      for (const client of clients) {
        await client.connect();
        await client.query(`begin; set local role kronaut_app;
          select set_config('app.workspace_id', '01900000-0000-7000-8000-000000000801', true),
                 set_config('app.actor', 'system', true)`);
      }
      const [first, second] = clients as [pg.Client, pg.Client];
      const pid = (await second.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]
        ?.pid;
      await finalize(first, '01900000-0000-7000-8000-000000000851');
      let finished = false;
      const blocked = finalize(second, '01900000-0000-7000-8000-000000000852').then(() => {
        finished = true;
      });
      const waiting = `select 1 from pg_stat_activity where pid = ${pid} and wait_event_type = 'Lock'`;
      while (!finished && (await query(url, waiting)).length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await first.query('commit');
      await blocked;
      await second.query('commit');
    } finally {
      await Promise.all(clients.map((client) => client.end()));
    }
    const rows = await query<{ publish_summary: string; settle_seq: number }>(
      url,
      `select publish_summary, settle_seq from posts where id = '01900000-0000-7000-8000-000000000841'`,
    );
    expect(rows[0]).toEqual({ publish_summary: 'completed_all', settle_seq: 1 });
  });

  it('produces a schema that passes the privilege, agent-dirty, approval, scheduler and summary test scripts', async () => {
    const url = await freshDatabase('scripts');
    await migrate({ connectionString: url });
    await runScript(url, 'privileges.sql');
    await runScript(url, 'agent-dirty-guard.sql');
    await runScript(url, 'approval-guard.sql');
    await runScript(url, 'approval-requester.sql');
    await runScript(url, 'approval-tolerance.sql');
    await runScript(url, 'scheduled-by.sql');
    await runScript(url, 'publish-summary.sql');
  });

  it('gives a database migrated from scratch the notification email column and index', async () => {
    const url = await freshDatabase('notification_email');
    await migrate({ connectionString: url });
    await expectNotificationEmailSchema(url);
    await expectEmailMutedSchema(url);
  });

  it('upgrades a database that recorded through 0004 to the email_muted column', async () => {
    const url = await freshDatabase('through_0004');
    await recordThrough(url, 4);
    await query(
      url,
      `insert into organizations (id, name) values ('01900000-0000-7000-8000-0000000005a1', 'O');
       insert into workspaces (id, organization_id, name, slug, timezone)
         values ('01900000-0000-7000-8000-0000000005b1', '01900000-0000-7000-8000-0000000005a1',
                 'W', 'w', 'UTC');
       insert into users (id, email, email_normalized, display_name, password_hash)
         values ('01900000-0000-7000-8000-0000000005c1', 'm@x', 'm@x', 'M', 'h');
       insert into memberships (workspace_id, user_id, role)
         values ('01900000-0000-7000-8000-0000000005b1', '01900000-0000-7000-8000-0000000005c1', 'editor');`,
    );
    const result = await migrate({ connectionString: url });
    expect(result.applied).toEqual(ALL.slice(4));
    await expectEmailMutedSchema(url);
    const rows = await query<{ email_muted: string[] }>(url, 'select email_muted from memberships');
    expect(rows).toEqual([{ email_muted: [] }]);
    await expect(query(url, "update memberships set email_muted = '{posts}'")).rejects.toThrow(
      /ck_memberships_email_muted/,
    );
  });

  it('adds the video upload columns with validated constraints and keeps the media GC grant', async () => {
    const url = await freshDatabase('video_upload');
    await migrate({ connectionString: url });
    const w = '01900000-0000-7000-8000-0000000007b1';
    const kept = '01900000-0000-7000-8000-0000000007d1';
    const dup = '01900000-0000-7000-8000-0000000007d2';
    await query(
      url,
      `insert into organizations (id, name) values ('01900000-0000-7000-8000-0000000007a1', 'O');
       insert into workspaces (id, organization_id, name, slug, timezone)
         values ('${w}', '01900000-0000-7000-8000-0000000007a1', 'W', 'w', 'UTC');
       insert into media_assets (workspace_id, id, kind, state, storage_key)
         values ('${w}', '${kept}', 'video', 'processing', repeat('a', 64));
       insert into media_assets (workspace_id, id, kind, state, storage_key, rejected_reason, duplicate_of_id)
         values ('${w}', '${dup}', 'video', 'rejected', repeat('b', 64), 'video_duplicate', '${kept}');`,
    );
    await expect(
      query(url, `update media_assets set rejected_reason = 'video_bogus' where id = '${dup}'`),
    ).rejects.toThrow(/ck_media_assets_rejected_reason/);
    await expect(
      query(url, `update media_assets set rejected_reason = 'video_too_long' where id = '${kept}'`),
    ).rejects.toThrow(/ck_media_assets_rejected_state/);
    await query(url, `delete from media_assets where id = '${kept}'`);
    expect(
      await query(url, `select id, duplicate_of_id from media_assets where workspace_id = '${w}'`),
    ).toEqual([{ id: dup, duplicate_of_id: null }]);
    const constraints = await query<{ conname: string; convalidated: boolean }>(
      url,
      `select conname, convalidated from pg_constraint
        where conrelid = 'public.media_assets'::regclass
          and conname in ('ck_media_assets_rejected_reason', 'ck_media_assets_rejected_state',
                          'fk_media_assets_duplicate_of')
        order by conname`,
    );
    expect(constraints.map((row) => row.convalidated)).toEqual([true, true, true]);
    expect(
      await query(
        url,
        `select has_function_privilege('kronaut_app', 'sweep_media_gc(integer)', 'execute') as app,
                has_function_privilege('public', 'sweep_media_gc(integer)', 'execute') as anyone`,
      ),
    ).toEqual([{ app: true, anyone: false }]);
  });

  it('adds a validated frame rate column that only a video may carry', async () => {
    const url = await freshDatabase('frame_rate');
    await migrate({ connectionString: url });
    const w = '01900000-0000-7000-8000-0000000008b1';
    const video = '01900000-0000-7000-8000-0000000008d1';
    const image = '01900000-0000-7000-8000-0000000008d2';
    await query(
      url,
      `insert into organizations (id, name) values ('01900000-0000-7000-8000-0000000008a1', 'O');
       insert into workspaces (id, organization_id, name, slug, timezone)
         values ('${w}', '01900000-0000-7000-8000-0000000008a1', 'W', 'w', 'UTC');
       insert into media_assets (workspace_id, id, kind, state, storage_key, frame_rate_milli)
         values ('${w}', '${video}', 'video', 'processing', repeat('a', 64), 29970);
       insert into media_assets (workspace_id, id, kind, state, storage_key)
         values ('${w}', '${image}', 'image', 'processing', repeat('b', 64));`,
    );
    await expect(
      query(url, `update media_assets set frame_rate_milli = 30000 where id = '${image}'`),
    ).rejects.toThrow(/ck_media_assets_frame_rate/);
    await expect(
      query(url, `update media_assets set frame_rate_milli = 0 where id = '${video}'`),
    ).rejects.toThrow(/ck_media_assets_frame_rate/);
    expect(
      await query(
        url,
        `select convalidated from pg_constraint
          where conrelid = 'public.media_assets'::regclass and conname = 'ck_media_assets_frame_rate'`,
      ),
    ).toEqual([{ convalidated: true }]);
  });

  it('adds the reply chain reasons, the item anchor and validated item position checks', async () => {
    const url = await freshDatabase('reply_chains');
    await migrate({ connectionString: url });
    expect(
      await query(
        url,
        `select state, code from destination_state_reasons
          where code in ('chain_next', 'thread_incomplete') order by code`,
      ),
    ).toEqual([
      { state: 'retry_wait', code: 'chain_next' },
      { state: 'failed', code: 'thread_incomplete' },
    ]);
    expect(
      await query(
        url,
        `select table_name, data_type from information_schema.columns
          where table_name in ('destination_items', 'publish_attempts') and column_name = 'anchor'
          order by table_name`,
      ),
    ).toEqual([
      { table_name: 'destination_items', data_type: 'jsonb' },
      { table_name: 'publish_attempts', data_type: 'jsonb' },
    ]);
    expect(
      await query(
        url,
        `select conname, convalidated from pg_constraint
          where conrelid = 'public.destination_items'::regclass
            and conname in ('ck_destination_items_position', 'ck_destination_items_main')
          order by conname`,
      ),
    ).toEqual([
      { conname: 'ck_destination_items_main', convalidated: true },
      { conname: 'ck_destination_items_position', convalidated: true },
    ]);
  });

  it('upgrades a database that recorded only v1 and still passes the privilege script', async () => {
    const url = await freshDatabase('v1_only');
    await recordThrough(url, 1);
    const result = await migrate({ connectionString: url });
    expect(result.applied).toEqual(ALL.slice(1));
    await expectNotificationEmailSchema(url);
    await runScript(url, 'privileges.sql');
  });
});
