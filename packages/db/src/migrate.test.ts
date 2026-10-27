import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMigrations } from './migrate.ts';

let dir: string;
let baseline: string;
let migrations: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kronaut-migrate-'));
  baseline = join(dir, 'v1.sql');
  migrations = join(dir, 'migrations');
  await writeFile(baseline, 'select 1;\n');
  await mkdir(migrations);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function add(name: string, sql = 'select 2;\n'): Promise<void> {
  await writeFile(join(migrations, name), sql);
}

describe('loadMigrations', () => {
  it('returns the baseline as version 1', async () => {
    const [first, ...rest] = await loadMigrations(baseline, migrations);
    expect(rest).toEqual([]);
    expect(first).toMatchObject({ version: 1, name: 'v1', label: '0001_v1', sql: 'select 1;\n' });
    expect(first?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores .gitkeep and treats a missing directory as empty', async () => {
    await writeFile(join(migrations, '.gitkeep'), '');
    expect(await loadMigrations(baseline, migrations)).toHaveLength(1);
    expect(await loadMigrations(baseline, join(dir, 'absent'))).toHaveLength(1);
  });

  it('orders migrations by version', async () => {
    await add('0003_third.sql');
    await add('0002_second.sql');
    const loaded = await loadMigrations(baseline, migrations);
    expect(loaded.map((m) => m.label)).toEqual(['0001_v1', '0002_second', '0003_third']);
  });

  it('hashes file contents', async () => {
    await add('0002_a.sql', 'select 2;\n');
    const [, a] = await loadMigrations(baseline, migrations);
    await add('0002_a.sql', 'select 3;\n');
    const [, b] = await loadMigrations(baseline, migrations);
    expect(a?.sha256).not.toBe(b?.sha256);
  });

  it('rejects duplicate versions', async () => {
    await add('0002_a.sql');
    await add('0002_b.sql');
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(/duplicate/);
  });

  it('rejects a migration that reuses version 1', async () => {
    await add('0001_again.sql');
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(/duplicate/);
  });

  it('rejects gaps in the version sequence', async () => {
    await add('0003_skip.sql');
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(/contiguous/);
  });

  it('rejects file names that do not match NNNN_name.sql', async () => {
    await add('add_things.sql');
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(/NNNN_name\.sql/);
  });
});

describe('loadMigrations concurrently rule', () => {
  const index = 'create index concurrently on t (c);';

  it('accepts a file whose only statement is concurrent', async () => {
    await add('0002_a.sql', `-- why\n${index}\n/* done */\n`);
    await add('0003_b.sql', 'CREATE UNIQUE INDEX CONCURRENTLY u ON t (c)');
    expect(await loadMigrations(baseline, migrations)).toHaveLength(3);
  });

  it.each([
    ['a preceding set', `set lock_timeout = '5s';\n${index}`],
    ['a following validate', `${index}\nalter table t validate constraint k;`],
    ['an explicit transaction', `begin;\n${index}\ncommit;`],
    ['two concurrent statements', `${index}\n${index}`],
  ])('rejects concurrently combined with %s', async (_label, sql) => {
    await add('0002_a.sql', sql);
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(
      /migration 0002_a: CREATE INDEX CONCURRENTLY must be the only statement in its file/,
    );
  });

  it('ignores the word inside comments, strings and dollar quotes', async () => {
    await add(
      '0002_a.sql',
      [
        '-- run concurrently later',
        "comment on table t is 'built concurrently; do not hurry';",
        "select e'it\\'s concurrently; fine';",
        'select $$ concurrently; $$;',
        'select $tag$ concurrently; $tag$;',
        'select "concurrently";',
        '/* concurrently; */ select 1;',
      ].join('\n'),
    );
    expect(await loadMigrations(baseline, migrations)).toHaveLength(2);
  });
});

describe('loadMigrations transaction rule', () => {
  it.each([
    ['begin', 'begin;\nselect 2;\ncommit;'],
    ['start transaction', 'START TRANSACTION;\nselect 2;'],
    ['rollback', 'select 2;\nrollback;'],
  ])('rejects a file that controls its own transaction with %s', async (_label, sql) => {
    await add('0002_a.sql', sql);
    await expect(loadMigrations(baseline, migrations)).rejects.toThrow(
      /migration 0002_a: the runner owns the transaction/,
    );
  });

  it('allows BEGIN inside function bodies', async () => {
    await add('0002_a.sql', 'do $$ begin perform 1; end $$;\n');
    const [, second] = await loadMigrations(baseline, migrations);
    expect(second?.transactional).toBe(true);
  });

  it('runs a concurrent index outside a transaction', async () => {
    await add('0002_a.sql', 'create index concurrently on t (c);');
    const [, second] = await loadMigrations(baseline, migrations);
    expect(second?.transactional).toBe(false);
  });
});

describe('loadMigrations defaults', () => {
  it('reads the committed v1 schema', async () => {
    const [first] = await loadMigrations();
    expect(first?.label).toBe('0001_v1');
    expect(first?.sql).toContain('CREATE TABLE instance_state');
  });
});
