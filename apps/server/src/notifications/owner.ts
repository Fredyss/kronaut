import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';

export interface Owner {
  readonly workspaceId: string;
  readonly userId: string;
  readonly scope: AccessScope | null;
}

export function ownerOf(ctx: RequestContext, workspaceId: string): Owner {
  const decision = ctx.authorize('posts:read', { workspaceId });
  const principal = ctx.principal;
  if (principal?.kind !== 'user')
    throw new HttpError('internal', 'No user is bound to this request.');
  return {
    workspaceId,
    userId: principal.userId,
    scope: decision.kind === 'allow_scoped' ? decision.scope : null,
  };
}

function anyOf(ids: readonly string[]) {
  return sql`${[...ids]}::uuid[]`;
}

function accountIn(scope: AccessScope) {
  return sql<boolean>`coalesce(a.id = ANY(${anyOf(scope.socialAccountIds)})
    OR a.brand_id = ANY(${anyOf(scope.brandIds)})
    OR a.location_id = ANY(${anyOf(scope.locationIds)}), false)`;
}

export function ownRows(trx: TenantDb, owner: Owner) {
  const rows = trx
    .selectFrom('notifications as n')
    .leftJoin('social_accounts as a', (join) =>
      join
        .onRef('a.workspace_id', '=', 'n.workspace_id')
        .on('a.id', '=', sql<string>`(n.payload->>'socialAccountId')::uuid`),
    )
    .where('n.workspace_id', '=', owner.workspaceId)
    .where('n.user_id', '=', owner.userId);
  return owner.scope === null ? rows : rows.where(accountIn(owner.scope));
}

export async function unreadCount(trx: TenantDb, owner: Owner): Promise<number> {
  const { unread } = await ownRows(trx, owner)
    .select((eb) => eb.fn.countAll<string>().as('unread'))
    .where('n.read_at', 'is', null)
    .executeTakeFirstOrThrow();
  return Number(unread);
}
