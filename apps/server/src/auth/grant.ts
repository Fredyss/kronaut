import type { Database } from '@kronaut/db';
import { sql } from 'kysely';
import { hmacToken } from '../crypto.ts';

const GRANT_TOKEN = /^kro_[0-9a-z]{16,32}_[A-Za-z0-9_-]{16,256}$/;
const BEARER = /^Bearer ([^\s]+)$/i;

export interface GrantTokenRecord {
  readonly workspaceId: string;
  readonly grantId: string;
  readonly scopes: readonly string[];
  readonly sponsorUserId: string;
}

interface GrantTokenRow {
  workspace_id: string;
  grant_id: string;
  token_kind: string;
  scopes: string[];
  sponsor_user_id: string;
}

export function bearerToken(header: string): string | null {
  return BEARER.exec(header.trim())?.[1] ?? null;
}

export function isGrantToken(value: string): boolean {
  return GRANT_TOKEN.test(value);
}

export function hashGrantToken(key: Uint8Array, token: string): Buffer {
  return hmacToken(key, token);
}

export async function findGrantToken(
  db: Database,
  key: Uint8Array,
  token: string,
): Promise<GrantTokenRecord | null> {
  if (!isGrantToken(token)) return null;
  const hash = hashGrantToken(key, token);
  const result = await db.withActor({ kind: 'system' }, (trx) =>
    sql<GrantTokenRow>`select * from auth_lookup_grant_token(${hash})`.execute(trx),
  );
  const row = result.rows[0];
  if (row === undefined || row.token_kind === 'refresh') return null;
  return {
    workspaceId: row.workspace_id,
    grantId: row.grant_id,
    scopes: row.scopes,
    sponsorUserId: row.sponsor_user_id,
  };
}
