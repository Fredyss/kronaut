import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const LOCK_KEY = 0x6b726f6e617574n.toString();
const BASELINE_FILE = join(import.meta.dirname, '..', 'schema', 'v1.sql');
const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');
const MIGRATION_FILE = /^(\d{4})_([a-z0-9][a-z0-9_]*)\.sql$/;

const LOCK_TIMEOUT = '3s';
const LOCK_POLL_MS = 200;
const NON_CODE =
  /--[^\n]*|\/\*[\s\S]*?\*\/|\b[eE]'(?:[^'\\]|\\[\s\S]|'')*'|'(?:[^']|'')*'|"(?:[^"]|"")*"|\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g;
const CONCURRENTLY = /\bconcurrently\b/i;
const TRANSACTION_CONTROL = /^(begin|start\s+transaction|commit|rollback|abort)\b/i;

const BOOKKEEPING_DDL = `
create schema if not exists kronaut_meta;
create table if not exists kronaut_meta.migrations (
  version integer primary key,
  name text not null,
  sha256 text not null,
  applied_at timestamptz not null default now()
);
`;

export interface MigrateOptions {
  connectionString: string;
  log?: (msg: string) => void;
}

export interface MigrateResult {
  applied: string[];
}

export interface Migration {
  version: number;
  name: string;
  label: string;
  sql: string;
  sha256: string;
  transactional: boolean;
}

function statementsOf(sql: string): string[] {
  return sql
    .replace(NON_CODE, ' ')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
}

async function readMigration(version: number, name: string, file: string): Promise<Migration> {
  const sql = await readFile(file, 'utf8');
  const label = `${String(version).padStart(4, '0')}_${name}`;
  const statements = statementsOf(sql);
  const concurrent = statements.some((statement) => CONCURRENTLY.test(statement));
  if (concurrent && statements.length > 1) {
    throw new Error(
      `migration ${label}: CREATE INDEX CONCURRENTLY must be the only statement in its file`,
    );
  }
  if (statements.some((statement) => TRANSACTION_CONTROL.test(statement))) {
    throw new Error(`migration ${label}: the runner owns the transaction; remove BEGIN and COMMIT`);
  }
  return {
    version,
    name,
    label,
    sql,
    sha256: createHash('sha256').update(sql).digest('hex'),
    transactional: !concurrent,
  };
}

async function listMigrationFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((entry) => entry.endsWith('.sql')).sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function loadMigrations(
  baselineFile: string = BASELINE_FILE,
  migrationsDir: string = MIGRATIONS_DIR,
): Promise<Migration[]> {
  const migrations = [await readMigration(1, 'v1', baselineFile)];
  const files: { version: number; name: string; file: string }[] = [];
  for (const entry of await listMigrationFiles(migrationsDir)) {
    const match = MIGRATION_FILE.exec(entry);
    if (!match?.[1] || !match[2]) {
      throw new Error(`migration file name must be NNNN_name.sql: ${entry}`);
    }
    files.push({ version: Number(match[1]), name: match[2], file: join(migrationsDir, entry) });
  }
  files.sort((a, b) => a.version - b.version);
  let previous = 1;
  for (const { version, name, file } of files) {
    if (version === previous) throw new Error(`duplicate migration version ${version}`);
    if (version !== previous + 1) {
      throw new Error(
        `migration versions must be contiguous: expected ${previous + 1}, found ${version}`,
      );
    }
    migrations.push(await readMigration(version, name, file));
    previous = version;
  }
  return migrations;
}

type Recorded = ReadonlyMap<number, string>;

function assertUnchanged(migrations: readonly Migration[], recorded: Recorded): void {
  for (const migration of migrations) {
    const sha256 = recorded.get(migration.version);
    if (sha256 !== undefined && sha256 !== migration.sha256) {
      throw new Error(
        `migration ${migration.label} changed after it was applied (recorded ${sha256}, file ${migration.sha256})`,
      );
    }
  }
}

async function assertBaselineRecorded(client: pg.Client, recorded: Recorded): Promise<void> {
  if (!recorded.has(1)) {
    const existing = await client.query<{ present: boolean }>(
      "select to_regclass('public.instance_state') is not null as present",
    );
    if (existing.rows[0]?.present) {
      throw new Error('public.instance_state exists but migration 0001_v1 is not recorded');
    }
  }
}

// A runner blocked inside pg_advisory_lock holds a snapshot, and CREATE INDEX CONCURRENTLY in the
// lock holder waits for every older snapshot: the two would deadlock. Polling holds none between tries.
async function acquireLock(client: pg.Client): Promise<void> {
  for (;;) {
    const result = await client.query<{ locked: boolean }>(
      'select pg_try_advisory_lock($1::bigint) as locked',
      [LOCK_KEY],
    );
    if (result.rows[0]?.locked === true) return;
    await sleep(LOCK_POLL_MS);
  }
}

async function applyPending(
  client: pg.Client,
  migrations: readonly Migration[],
  recorded: Recorded,
  log: (msg: string) => void,
): Promise<string[]> {
  const applied: string[] = [];
  for (const migration of migrations) {
    if (recorded.has(migration.version)) continue;
    log(`applying ${migration.label}`);
    if (migration.transactional) await client.query('begin');
    await client.query(migration.sql);
    await client.query(
      'insert into kronaut_meta.migrations (version, name, sha256) values ($1, $2, $3)',
      [migration.version, migration.name, migration.sha256],
    );
    if (migration.transactional) await client.query('commit');
    applied.push(migration.label);
  }
  return applied;
}

export async function migrate(options: MigrateOptions): Promise<MigrateResult> {
  const log = options.log ?? (() => {});
  const migrations = await loadMigrations();
  const client = new pg.Client({
    connectionString: options.connectionString,
    application_name: 'kronaut-migrate',
  });
  await client.connect();
  try {
    await acquireLock(client);
    await client.query(`set lock_timeout = '${LOCK_TIMEOUT}'`);
    await client.query(BOOKKEEPING_DDL);

    const rows = await client.query<{ version: number; sha256: string }>(
      'select version, sha256 from kronaut_meta.migrations order by version',
    );
    const recorded = new Map(rows.rows.map((row) => [row.version, row.sha256]));

    assertUnchanged(migrations, recorded);
    await assertBaselineRecorded(client, recorded);
    const applied = await applyPending(client, migrations, recorded, log);
    log(applied.length === 0 ? 'schema is up to date' : `applied ${applied.length} migration(s)`);
    return { applied };
  } finally {
    await client.end().catch(() => {});
  }
}
