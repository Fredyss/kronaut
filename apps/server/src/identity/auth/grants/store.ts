import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import { type AccessIds, type GrantPage, NO_ACCESS } from './input.ts';

export interface GrantRow {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly scopes: string[];
  readonly resource_scope: string;
  readonly rate_limit_per_min: number | null;
  readonly sponsor_user_id: string;
  readonly expires_at: Date | null;
  readonly revoked_at: Date | null;
  readonly created_at: Date;
}

export interface ListedGrant {
  readonly row: GrantRow;
  readonly keyId: string | null;
  readonly access: AccessIds;
}

export const GRANT_COLUMNS = [
  'id',
  'kind',
  'name',
  'scopes',
  'resource_scope',
  'rate_limit_per_min',
  'sponsor_user_id',
  'expires_at',
  'revoked_at',
  'created_at',
] as const;

interface ScopeRow {
  readonly grant_id: string | null;
  readonly brand_id: string | null;
  readonly location_id: string | null;
  readonly social_account_id: string | null;
}

function accessOf(rows: readonly ScopeRow[]): AccessIds {
  const pick = (value: (row: ScopeRow) => string | null) =>
    rows.flatMap((row) => {
      const id = value(row);
      return id === null ? [] : [id];
    });
  return {
    brandIds: pick((row) => row.brand_id),
    locationIds: pick((row) => row.location_id),
    accountIds: pick((row) => row.social_account_id),
  };
}

export const API_KEY = 'api_key';
export interface ListedPage {
  readonly grants: ListedGrant[];
  readonly nextAfter: string | null;
}

function byGrant<T extends { readonly grant_id: string | null }>(
  rows: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (row.grant_id === null) continue;
    grouped.set(row.grant_id, [...(grouped.get(row.grant_id) ?? []), row]);
  }
  return grouped;
}

export async function listGrants(
  trx: TenantDb,
  workspaceId: string,
  page: GrantPage,
): Promise<ListedPage> {
  let query = trx
    .selectFrom('access_grants')
    .select(GRANT_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('kind', '=', API_KEY);
  if (page.after !== null) query = query.where('id', '<', page.after);
  const fetched = await query
    .orderBy('id', 'desc')
    .limit(page.limit + 1)
    .execute();
  const rows = fetched.slice(0, page.limit);
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return { grants: [], nextAfter: null };
  const keys = await trx
    .selectFrom('grant_tokens')
    .select(['grant_id', 'key_id'])
    .where('workspace_id', '=', workspaceId)
    .where('kind', '=', 'key')
    .where('grant_id', 'in', ids)
    .execute();
  const scopes = await trx
    .selectFrom('access_scopes')
    .select(['grant_id', 'brand_id', 'location_id', 'social_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where('grant_id', 'in', ids)
    .execute();
  const keyOf = byGrant(keys);
  const scopesOf = byGrant(scopes);
  const grants = rows.map((row) => ({
    row,
    keyId: keyOf.get(row.id)?.[0]?.key_id ?? null,
    access: row.resource_scope === 'restricted' ? accessOf(scopesOf.get(row.id) ?? []) : NO_ACCESS,
  }));
  const last = rows.at(-1);
  return { grants, nextAfter: fetched.length > page.limit && last !== undefined ? last.id : null };
}

function statusOf(row: GrantRow, now: Temporal.Instant): 'active' | 'expired' | 'revoked' {
  if (row.revoked_at !== null) return 'revoked';
  if (row.expires_at !== null && row.expires_at.getTime() <= now.epochMilliseconds)
    return 'expired';
  return 'active';
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function grantDto({ row, keyId, access }: ListedGrant, now: Temporal.Instant) {
  const restricted = row.resource_scope === 'restricted';
  return {
    id: encodePublicId('grant', row.id),
    kind: row.kind,
    name: row.name,
    status: statusOf(row, now),
    scopes: row.scopes,
    resourceScope: restricted ? ('restricted' as const) : ('workspace' as const),
    access: restricted
      ? {
          brandIds: access.brandIds.map((id) => encodePublicId('brand', id)),
          locationIds: access.locationIds.map((id) => encodePublicId('location', id)),
          accountIds: access.accountIds.map((id) => encodePublicId('socialAccount', id)),
        }
      : null,
    tokenPrefix: keyId === null ? null : `kro_${keyId}`,
    rateLimitPerMinute: row.rate_limit_per_min,
    sponsorId: encodePublicId('user', row.sponsor_user_id),
    expiresAt: iso(row.expires_at),
    revokedAt: iso(row.revoked_at),
    createdAt: row.created_at.toISOString(),
  };
}
