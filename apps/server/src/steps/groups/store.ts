import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { accountInScope } from '../../access/post-access/reads.ts';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import { auditGroup, type GroupRef } from './audit.ts';

export const NAME_MAX = 120;

const NAME_UNIQUE: ReadonlySet<unknown> = new Set([
  'ux_account_groups_name',
  'account_groups_workspace_id_name_key',
]);

function groupName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw new HttpError('unprocessable', `A group name has 1–${NAME_MAX} characters.`, {
      details: [{ path: 'body.name', code: 'name_invalid' }],
    });
  }
  return name;
}

async function uniquely<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    const { code, constraint } = err as { code?: unknown; constraint?: unknown };
    if (code !== '23505' || !NAME_UNIQUE.has(constraint)) throw err;
    throw new HttpError('group_name_taken', 'A group with this name already exists.');
  }
}

function groupRows(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  const counted = scope === null ? sql<boolean>`true` : accountInScope(scope);
  return trx
    .selectFrom('account_groups as g')
    .select(['g.id', 'g.name'])
    .select(
      sql<string[]>`ARRAY(
        SELECT a.id::text FROM account_group_members m
        JOIN social_accounts a ON a.workspace_id = m.workspace_id AND a.id = m.social_account_id
        WHERE m.workspace_id = g.workspace_id AND m.group_id = g.id AND ${counted}
        ORDER BY a.created_at, a.id)`.as('channel_ids'),
    )
    .where('g.workspace_id', '=', workspaceId);
}

export type GroupRow = Awaited<ReturnType<ReturnType<typeof groupRows>['execute']>>[number];

export async function listGroups(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  let query = groupRows(trx, workspaceId, scope);
  if (scope !== null) {
    query = query.where(
      sql<boolean>`EXISTS (
        SELECT 1 FROM account_group_members m
        JOIN social_accounts a ON a.workspace_id = m.workspace_id AND a.id = m.social_account_id
        WHERE m.workspace_id = g.workspace_id AND m.group_id = g.id AND ${accountInScope(scope)})`,
    );
  }
  return await query.orderBy(sql`lower(g.name)`).orderBy('g.id').execute();
}

async function readGroup(trx: TenantDb, { workspaceId, groupId }: GroupRef) {
  const row = await groupRows(trx, workspaceId, null)
    .where('g.id', '=', groupId)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Group not found.');
  return row;
}

export async function createGroup(
  trx: TenantDb,
  ctx: RequestContext,
  workspaceId: string,
  body: { readonly name: string },
) {
  const name = groupName(body.name);
  const { id: groupId } = await uniquely(() =>
    trx
      .insertInto('account_groups')
      .values({ workspace_id: workspaceId, name, created_by: ctx.session?.userId ?? null })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  const ref = { workspaceId, groupId };
  await auditGroup(trx, ctx, { ref, action: 'account_group.created' });
  return await readGroup(trx, ref);
}

async function lockGroup(trx: TenantDb, { workspaceId, groupId }: GroupRef) {
  const row = await trx
    .selectFrom('account_groups')
    .select('name')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', groupId)
    .forNoKeyUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Group not found.');
  return row;
}

export async function renameGroup(
  trx: TenantDb,
  ctx: RequestContext,
  ref: GroupRef,
  body: { readonly name: string },
) {
  const current = await lockGroup(trx, ref);
  const name = groupName(body.name);
  if (name === current.name) return await readGroup(trx, ref);
  await uniquely(() =>
    trx
      .updateTable('account_groups')
      .set({ name })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.groupId)
      .execute(),
  );
  await auditGroup(trx, ctx, { ref, action: 'account_group.renamed' });
  return await readGroup(trx, ref);
}

export async function deleteGroup(trx: TenantDb, ctx: RequestContext, ref: GroupRef) {
  const deleted = await trx
    .deleteFrom('account_groups')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.groupId)
    .returning('id')
    .executeTakeFirst();
  if (deleted === undefined) throw new HttpError('not_found', 'Group not found.');
  await auditGroup(trx, ctx, { ref, action: 'account_group.deleted' });
}
