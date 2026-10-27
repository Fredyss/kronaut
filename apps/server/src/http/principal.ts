import {
  type AccessScope,
  type GrantPrincipal,
  ROLES,
  type Role,
  type UserPrincipal,
} from '@kronaut/core';
import type { Database, TenantDb } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import type { GrantTokenRecord } from '../auth/grant.ts';
import type { SessionInfo } from './types.ts';

export interface Bound<P> {
  readonly principal: P;
  readonly accessScope: AccessScope | undefined;
}

function toRole(value: string): Role {
  const role = ROLES.find((r) => r === value);
  if (role === undefined) throw new Error('membership has an unknown role');
  return role;
}

async function loadAccessScope(
  trx: TenantDb,
  workspaceId: string,
  column: 'user_id' | 'grant_id',
  id: string,
): Promise<AccessScope> {
  const rows = await trx
    .selectFrom('access_scopes')
    .select(['brand_id', 'location_id', 'social_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where(column, '=', id)
    .execute();
  return {
    brandIds: rows.flatMap((r) => (r.brand_id === null ? [] : [r.brand_id])),
    locationIds: rows.flatMap((r) => (r.location_id === null ? [] : [r.location_id])),
    socialAccountIds: rows.flatMap((r) =>
      r.social_account_id === null ? [] : [r.social_account_id],
    ),
  };
}

export async function bindUserIn(
  trx: TenantDb,
  workspaceId: string,
  userId: string,
  authenticatedAt: Temporal.Instant,
): Promise<Bound<UserPrincipal> | null> {
  const membership = await trx
    .selectFrom('memberships')
    .select(['role', 'can_approve', 'resource_scope'])
    .where('workspace_id', '=', workspaceId)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  if (membership === undefined) return null;
  const restricted = membership.resource_scope === 'restricted';
  const principal: UserPrincipal = {
    kind: 'user',
    userId,
    workspaceId,
    role: toRole(membership.role),
    canApprove: membership.can_approve,
    restricted,
    authenticatedAt,
  };
  const accessScope = restricted
    ? await loadAccessScope(trx, workspaceId, 'user_id', userId)
    : undefined;
  return { principal, accessScope };
}

export async function bindUser(
  db: Database,
  workspaceId: string,
  session: SessionInfo,
): Promise<Bound<UserPrincipal> | null> {
  return await db.withTenant(workspaceId, { kind: 'user', id: session.userId }, (trx) =>
    bindUserIn(trx, workspaceId, session.userId, session.reauthenticatedAt),
  );
}

export async function bindGrantIn(
  trx: TenantDb,
  grant: GrantTokenRecord,
): Promise<Bound<GrantPrincipal> | null> {
  const row = await trx
    .selectFrom('access_grants')
    .select('resource_scope')
    .where('workspace_id', '=', grant.workspaceId)
    .where('id', '=', grant.grantId)
    .executeTakeFirst();
  if (row === undefined) return null;
  const sponsor = await trx
    .selectFrom('memberships')
    .select('role')
    .where('workspace_id', '=', grant.workspaceId)
    .where('user_id', '=', grant.sponsorUserId)
    .executeTakeFirst();
  const restricted = row.resource_scope === 'restricted';
  const principal: GrantPrincipal = {
    kind: 'grant',
    grantId: grant.grantId,
    workspaceId: grant.workspaceId,
    sponsorUserId: grant.sponsorUserId,
    sponsorRole: sponsor === undefined ? null : toRole(sponsor.role),
    scopes: grant.scopes,
    restricted,
  };
  const accessScope = restricted
    ? await loadAccessScope(trx, grant.workspaceId, 'grant_id', grant.grantId)
    : undefined;
  return { principal, accessScope };
}

export async function bindGrant(
  db: Database,
  grant: GrantTokenRecord,
): Promise<Bound<GrantPrincipal> | null> {
  return await db.withTenant(grant.workspaceId, { kind: 'grant', id: grant.grantId }, (trx) =>
    bindGrantIn(trx, grant),
  );
}
