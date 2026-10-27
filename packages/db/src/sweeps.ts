import { type Kysely, sql } from 'kysely';
import type { DB } from './schema.gen.ts';

export interface SweepRow {
  workspaceId: string;
  id: string;
}

export interface Sweeps {
  dueDestinations(limit?: number): Promise<SweepRow[]>;
  expiredLeases(limit?: number): Promise<SweepRow[]>;
  verifyingDestinations(limit?: number): Promise<SweepRow[]>;
  quarantineDestinations(limit?: number): Promise<SweepRow[]>;
  expiringCredentials(withinSeconds: number, limit?: number): Promise<SweepRow[]>;
  workspaces(after: string | null, limit?: number): Promise<string[]>;
}

interface RawSweepRow {
  workspace_id: string;
  id: string;
}

const MAX_LIMIT = 1000;

function checkLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`sweep limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function checkWithin(withinSeconds: number): number {
  if (!Number.isFinite(withinSeconds) || withinSeconds < 0) {
    throw new RangeError('withinSeconds must be a finite number of seconds >= 0');
  }
  return withinSeconds;
}

function toRows(rows: RawSweepRow[]): SweepRow[] {
  return rows.map((row) => ({ workspaceId: row.workspace_id, id: row.id }));
}

export function createSweeps(db: Kysely<DB>): Sweeps {
  return {
    async dueDestinations(limit = MAX_LIMIT) {
      const n = checkLimit(limit);
      const result = await sql<RawSweepRow>`
        select workspace_id, destination_id as id from sweep_due_destinations(${n})
      `.execute(db);
      return toRows(result.rows);
    },
    async expiredLeases(limit = MAX_LIMIT) {
      const n = checkLimit(limit);
      const result = await sql<RawSweepRow>`
        select workspace_id, destination_id as id from sweep_expired_leases(${n})
      `.execute(db);
      return toRows(result.rows);
    },
    async verifyingDestinations(limit = MAX_LIMIT) {
      const n = checkLimit(limit);
      const result = await sql<RawSweepRow>`
        select workspace_id, destination_id as id from sweep_verifying_destinations(${n})
      `.execute(db);
      return toRows(result.rows);
    },
    async quarantineDestinations(limit = MAX_LIMIT) {
      const n = checkLimit(limit);
      const result = await sql<RawSweepRow>`
        select workspace_id, destination_id as id from sweep_quarantine_destinations(${n})
      `.execute(db);
      return toRows(result.rows);
    },
    async expiringCredentials(withinSeconds, limit = MAX_LIMIT) {
      const within = checkWithin(withinSeconds);
      const n = checkLimit(limit);
      const result = await sql<RawSweepRow>`
        select workspace_id, credential_id as id
          from sweep_expiring_credentials(make_interval(secs => ${within}::double precision), ${n})
      `.execute(db);
      return toRows(result.rows);
    },
    async workspaces(after, limit = MAX_LIMIT) {
      const n = checkLimit(limit);
      const result = await sql<{ workspace_id: string }>`
        select workspace_id from sweep_workspaces(${after}::uuid, ${n})
      `.execute(db);
      return result.rows.map((row) => row.workspace_id);
    },
  };
}
