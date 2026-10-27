import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import { type Actor, actorSetting, isUuid } from './actor.ts';
import type { DB } from './schema.gen.ts';
import { createSweeps, type Sweeps } from './sweeps.ts';

export type TenantDb = Transaction<DB>;

export interface DatabaseOptions {
  connectionString: string;
  maxConnections?: number;
  applicationName?: string;
  onPoolError?: (err: Error) => void;
}

export interface Database {
  withTenant<T>(workspaceId: string, actor: Actor, fn: (db: TenantDb) => Promise<T>): Promise<T>;
  withActor<T>(actor: Actor, fn: (db: TenantDb) => Promise<T>): Promise<T>;
  sweeps: Sweeps;
  destroy(): Promise<void>;
}

const TIMESTAMP_OID = 1114;
const DATE_OID = 1082;

function rawString(value: string): string {
  return value;
}

const typeParsers = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === TIMESTAMP_OID || oid === DATE_OID) return rawString;
    return pg.types.getTypeParser(oid, format as 'text');
  },
} as pg.CustomTypesConfig;

export function createDatabase(options: DatabaseOptions): Database {
  const config: pg.PoolConfig = {
    connectionString: options.connectionString,
    types: typeParsers,
  };
  if (options.maxConnections !== undefined) config.max = options.maxConnections;
  if (options.applicationName !== undefined) config.application_name = options.applicationName;

  const pool = new pg.Pool(config);
  pool.on('error', options.onPoolError ?? ((err) => process.emitWarning(err)));

  const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });

  return {
    async withTenant(workspaceId, actor, fn) {
      if (!isUuid(workspaceId)) throw new TypeError('workspaceId must be a uuid');
      const actorValue = actorSetting(actor);
      const workspaceValue = workspaceId.toLowerCase();
      return await db.transaction().execute(async (trx) => {
        await sql`
          select set_config('app.workspace_id', ${workspaceValue}, true),
                 set_config('app.actor', ${actorValue}, true)
        `.execute(trx);
        return await fn(trx);
      });
    },
    async withActor(actor, fn) {
      const actorValue = actorSetting(actor);
      return await db.transaction().execute(async (trx) => {
        await sql`select set_config('app.actor', ${actorValue}, true)`.execute(trx);
        return await fn(trx);
      });
    },
    sweeps: createSweeps(db),
    async destroy() {
      await db.destroy();
    },
  };
}
