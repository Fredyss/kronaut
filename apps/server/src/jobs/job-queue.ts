import type { Database } from '@kronaut/db';
import { Logger, runMigrations } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger as AppLogger } from 'pino';

export const SILENT_JOB_LOGGER = new Logger(() => () => {});

function methodFor(level: unknown): 'error' | 'warn' | 'info' | 'debug' {
  const name = String(level);
  return name === 'error'
    ? 'error'
    : name === 'warning'
      ? 'warn'
      : name === 'info'
        ? 'info'
        : 'debug';
}

function failureOf(error: unknown): Record<string, unknown> {
  // pino serializes an Error only under `err`; graphile-worker passes it as `error`
  return error instanceof Error ? { err: error } : error === undefined ? {} : { error };
}

export function jobLogger(logger: AppLogger): Logger {
  return new Logger((scope) => (level, message, meta) => {
    const method = methodFor(level);
    const { error, ...rest } = meta ?? {};
    const failure = failureOf(error);
    logger[method]({ ...scope, ...rest, ...failure }, message);
  });
}

export async function installJobQueue(
  ownerUrl: string,
  owner: Database,
  logger: Logger = SILENT_JOB_LOGGER,
): Promise<void> {
  await runMigrations({ connectionString: ownerUrl, logger });
  await owner.withActor({ kind: 'cli' }, async (trx) => {
    await sql`grant usage on schema graphile_worker to kronaut_app`.execute(trx);
    await sql`grant select, insert, update, delete on all tables in schema graphile_worker to kronaut_app`.execute(
      trx,
    );
    await sql`grant usage, select, update on all sequences in schema graphile_worker to kronaut_app`.execute(
      trx,
    );
    await sql`grant execute on all functions in schema graphile_worker to kronaut_app`.execute(trx);
    // graphile-worker enables RLS without policies on its private tables; only the owner would pass
    const tables = await sql<{ name: string }>`
      select c.relname as name
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'graphile_worker' and c.relkind = 'r' and c.relrowsecurity
    `.execute(trx);
    for (const { name } of tables.rows) {
      const table = sql.table(`graphile_worker.${name}`);
      await sql`drop policy if exists kronaut_app_queue on ${table}`.execute(trx);
      await sql`create policy kronaut_app_queue on ${table} to kronaut_app using (true) with check (true)`.execute(
        trx,
      );
    }
  });
}
