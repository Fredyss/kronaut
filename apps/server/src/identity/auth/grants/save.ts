import { randomUUID } from 'node:crypto';
import { toDateOrNull } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../../base/http/errors.ts';
import type { RequestContext } from '../../../base/http/request.ts';
import { GRANT_HASH_KEY_VERSION, hashGrantToken, mintGrantToken } from '../grant.ts';
import { type AccessIds, refused } from './input.ts';
import { API_KEY, GRANT_COLUMNS, type ListedGrant } from './store.ts';

type Ctx = Pick<RequestContext, 'tenant' | 'requestId' | 'logger'>;

export interface GrantActor {
  readonly ctx: Ctx;
  readonly grantKey: Uint8Array;
  readonly workspaceId: string;
  readonly userId: string;
}

export interface NewGrant {
  readonly name: string;
  readonly scopes: readonly string[];
  readonly restricted: boolean;
  readonly access: AccessIds;
  readonly expiresAt: Temporal.Instant | null;
  readonly rateLimitPerMinute: number | null;
}

export interface CreatedGrant {
  readonly grant: ListedGrant;
  readonly token: string;
}

interface AuditEntry {
  readonly action: 'grant.created' | 'grant.revoked';
  readonly grantId: string;
  readonly args: Readonly<Record<string, unknown>>;
}

// Ids and codes only: the token, its hash and the key's name never reach the audit trail or the log.
async function audit(trx: TenantDb, actor: GrantActor, entry: AuditEntry): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: actor.workspaceId,
      actor_kind: 'user',
      actor_id: actor.userId,
      surface: 'ui',
      action: entry.action,
      resource_kind: 'grant',
      resource_id: entry.grantId,
      outcome: 'ok',
      args_summary: JSON.stringify(entry.args),
      correlation_id: randomUUID(),
      request_id: actor.ctx.requestId,
    })
    .execute();
  actor.ctx.logger.info({ grantId: entry.grantId, action: entry.action }, 'api key changed');
}

async function checkExist(
  trx: TenantDb,
  workspaceId: string,
  table: 'brands' | 'locations' | 'social_accounts',
  { ids, path }: { readonly ids: readonly string[]; readonly path: string },
): Promise<void> {
  if (ids.length === 0) return;
  const found = await trx
    .selectFrom(table)
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', 'in', [...ids])
    .execute();
  if (found.length !== ids.length) throw refused(path, 'not_found', 'The resource does not exist.');
}

async function insertAccess(
  trx: TenantDb,
  workspaceId: string,
  grantId: string,
  access: AccessIds,
) {
  await checkExist(trx, workspaceId, 'brands', {
    ids: access.brandIds,
    path: 'body.access.brandIds',
  });
  await checkExist(trx, workspaceId, 'locations', {
    ids: access.locationIds,
    path: 'body.access.locationIds',
  });
  await checkExist(trx, workspaceId, 'social_accounts', {
    ids: access.accountIds,
    path: 'body.access.accountIds',
  });
  const rows = [
    ...access.brandIds.map((id) => ({ brand_id: id })),
    ...access.locationIds.map((id) => ({ location_id: id })),
    ...access.accountIds.map((id) => ({ social_account_id: id })),
  ].map((unit) => ({ workspace_id: workspaceId, grant_id: grantId, ...unit }));
  if (rows.length > 0) await trx.insertInto('access_scopes').values(rows).execute();
}

function auditArgs(input: NewGrant) {
  return {
    kind: 'api_key',
    scopes: input.scopes,
    resource_scope: input.restricted ? 'restricted' : 'workspace',
    access_rows:
      input.access.brandIds.length +
      input.access.locationIds.length +
      input.access.accountIds.length,
    expires: input.expiresAt !== null,
    rate_limit_per_min: input.rateLimitPerMinute,
  };
}

export async function createGrant(actor: GrantActor, input: NewGrant): Promise<CreatedGrant> {
  const { workspaceId } = actor;
  const minted = mintGrantToken();
  const row = await actor.ctx.tenant(async (trx) => {
    const created = await trx
      .insertInto('access_grants')
      .values({
        workspace_id: workspaceId,
        kind: 'api_key',
        name: input.name,
        sponsor_user_id: actor.userId,
        scopes: [...input.scopes],
        resource_scope: input.restricted ? 'restricted' : 'workspace',
        rate_limit_per_min: input.rateLimitPerMinute,
        expires_at: toDateOrNull(input.expiresAt ?? undefined),
      })
      .returning(GRANT_COLUMNS)
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('grant_tokens')
      .values({
        workspace_id: workspaceId,
        grant_id: created.id,
        kind: 'key',
        key_id: minted.keyId,
        token_hash: hashGrantToken(actor.grantKey, minted.token),
        hash_key_version: GRANT_HASH_KEY_VERSION,
      })
      .execute();
    await insertAccess(trx, workspaceId, created.id, input.access);
    await audit(trx, actor, {
      action: 'grant.created',
      grantId: created.id,
      args: auditArgs(input),
    });
    return created;
  });
  return { grant: { row, keyId: minted.keyId, access: input.access }, token: minted.token };
}

export async function revokeGrant(actor: GrantActor, grantId: string): Promise<void> {
  const { workspaceId } = actor;
  await actor.ctx.tenant(async (trx) => {
    const grant = await trx
      .selectFrom('access_grants')
      .select(['kind', 'revoked_at'])
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', grantId)
      .where('kind', '=', API_KEY)
      .forUpdate()
      .executeTakeFirst();
    if (grant === undefined) throw new HttpError('not_found', 'Not found.');
    if (grant.revoked_at !== null) return;
    await trx
      .updateTable('access_grants')
      .set({ revoked_at: sql`now()`, revoked_by: actor.userId, updated_at: sql`now()` })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', grantId)
      .execute();
    await trx
      .updateTable('grant_tokens')
      .set({ revoked_at: sql`now()` })
      .where('workspace_id', '=', workspaceId)
      .where('grant_id', '=', grantId)
      .where('revoked_at', 'is', null)
      .execute();
    await audit(trx, actor, { action: 'grant.revoked', grantId, args: { kind: grant.kind } });
  });
}
