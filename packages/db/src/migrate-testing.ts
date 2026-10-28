import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { loadMigrations } from './migrate.ts';

export async function createDatabaseIn(
  container: StartedPostgreSqlContainer,
  name: string,
): Promise<string> {
  const admin = new pg.Client({ connectionString: container.getConnectionUri() });
  await admin.connect();
  try {
    await admin.query(`create database ${admin.escapeIdentifier(name)}`);
  } finally {
    await admin.end();
  }
  const url = new URL(container.getConnectionUri());
  url.pathname = `/${name}`;
  return url.toString();
}

export async function query<T extends pg.QueryResultRow>(
  connectionString: string,
  text: string,
): Promise<T[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return (await client.query<T>(text)).rows;
  } finally {
    await client.end();
  }
}

export async function recordThrough(url: string, last: number): Promise<void> {
  const migrations = (await loadMigrations()).filter((migration) => migration.version <= last);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`create schema kronaut_meta;
      create table kronaut_meta.migrations (
        version integer primary key, name text not null, sha256 text not null,
        applied_at timestamptz not null default now())`);
    for (const migration of migrations) {
      if (migration.transactional) await client.query('begin');
      await client.query(migration.sql);
      await client.query(
        'insert into kronaut_meta.migrations (version, name, sha256) values ($1, $2, $3)',
        [migration.version, migration.name, migration.sha256],
      );
      if (migration.transactional) await client.query('commit');
    }
  } finally {
    await client.end();
  }
}
