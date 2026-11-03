import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

interface LoginRow {
  user_id: string;
  password_hash: string | null;
  totp_enabled: boolean;
}

interface WorkspaceRow {
  workspace_id: string;
  organization_id: string;
  name: string;
  role: string;
  can_approve: boolean;
}

interface PasswordChange {
  readonly from: string | null;
  readonly to: string;
}

export async function lookupLogin(trx: TenantDb, email: string) {
  const result = await sql<LoginRow>`select * from auth_login_lookup(${email})`.execute(trx);
  return result.rows[0];
}

export async function readUserWorkspaces(trx: TenantDb, userId: string) {
  const result = await sql<WorkspaceRow>`
          select * from auth_user_workspaces(${userId})
        `.execute(trx);
  return result.rows;
}

export function readPasswordHash(trx: TenantDb, userId: string) {
  return trx
    .selectFrom('users')
    .select('password_hash')
    .where('id', '=', userId)
    .where('erased_at', 'is', null)
    .executeTakeFirst();
}

export async function replacePasswordHash(
  trx: TenantDb,
  userId: string,
  { from, to }: PasswordChange,
): Promise<boolean> {
  const updated = await trx
    .updateTable('users')
    .set({ password_hash: to })
    .where('id', '=', userId)
    .where('erased_at', 'is', null)
    .where(sql<boolean>`password_hash is not distinct from ${from}`)
    .executeTakeFirst();
  return updated.numUpdatedRows === 1n;
}
