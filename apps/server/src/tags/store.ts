import { randomUUID } from 'node:crypto';
import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { auditActor } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import { visibleIn } from '../posts/list.ts';
import { BY_NAME } from './read.ts';

export const NAME_MAX = 40;
export const WORKSPACE_MAX = 200;

const NAME_UNIQUE = 'ux_tags_name';

export interface TagRef {
  readonly workspaceId: string;
  readonly tagId: string;
}

function tagName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw new HttpError('unprocessable', `A tag name has 1–${NAME_MAX} characters.`, {
      details: [{ path: 'body.name', code: 'tag_name_invalid' }],
    });
  }
  return name;
}

function isDuplicateName(err: unknown): boolean {
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  return code === '23505' && constraint === NAME_UNIQUE;
}

async function uniquely<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (!isDuplicateName(err)) throw err;
    throw new HttpError('tag_exists', 'A tag with this name already exists.');
  }
}

function tagRows(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  const visible = scope === null ? sql<boolean>`true` : visibleIn(scope);
  return trx
    .selectFrom('tags as t')
    .select(['t.id', 't.name', 't.color'])
    .select(
      sql<string>`(
        SELECT count(*) FROM post_tags pt
        JOIN posts p ON p.workspace_id = pt.workspace_id AND p.id = pt.post_id
        WHERE pt.workspace_id = t.workspace_id AND pt.tag_id = t.id
          AND p.deleted_at IS NULL AND ${visible})`.as('post_count'),
    )
    .where('t.workspace_id', '=', workspaceId);
}

export type TagRow = Awaited<ReturnType<ReturnType<typeof tagRows>['execute']>>[number];

export function listTags(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  return tagRows(trx, workspaceId, scope).orderBy(BY_NAME).orderBy('t.id').execute();
}

async function readTag(trx: TenantDb, { workspaceId, tagId }: TagRef) {
  const row = await tagRows(trx, workspaceId, null).where('t.id', '=', tagId).executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Tag not found.');
  return row;
}

interface TagAudit {
  readonly ref: TagRef;
  readonly action: string;
  readonly args: Readonly<Record<string, unknown>>;
}

async function audit(trx: TenantDb, ctx: RequestContext, { ref, action, args }: TagAudit) {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action,
      resource_kind: 'tag',
      resource_id: ref.tagId,
      outcome: 'ok',
      args_summary: JSON.stringify(args),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

export async function createTag(
  trx: TenantDb,
  ctx: RequestContext,
  workspaceId: string,
  body: { readonly name: string; readonly color: string },
) {
  const name = tagName(body.name);
  await sql`select pg_advisory_xact_lock(hashtextextended(${`tags:${workspaceId}`}, 0))`.execute(
    trx,
  );
  const { total } = await trx
    .selectFrom('tags')
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirstOrThrow();
  if (Number(total) >= WORKSPACE_MAX) {
    throw new HttpError('tag_limit', `A workspace has at most ${WORKSPACE_MAX} tags.`);
  }
  const { id: tagId } = await uniquely(() =>
    trx
      .insertInto('tags')
      .values({ workspace_id: workspaceId, name, color: body.color })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  const ref = { workspaceId, tagId };
  await audit(trx, ctx, { ref, action: 'tag.created', args: { color: body.color } });
  return await readTag(trx, ref);
}

export async function updateTag(
  trx: TenantDb,
  ctx: RequestContext,
  ref: TagRef,
  body: { readonly name?: string | undefined; readonly color?: string | undefined },
) {
  const current = await readTag(trx, ref);
  const name = body.name === undefined ? current.name : tagName(body.name);
  const color = body.color ?? current.color;
  if (name === current.name && color === current.color) return current;
  const fields = {
    ...(body.name === undefined ? {} : { name }),
    ...(body.color === undefined ? {} : { color }),
  };
  await uniquely(() =>
    trx
      .updateTable('tags')
      .set({ ...fields, updated_at: sql`now()` })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.tagId)
      .execute(),
  );
  const args = { renamed: name !== current.name, color };
  await audit(trx, ctx, { ref, action: 'tag.updated', args });
  return await readTag(trx, ref);
}

export async function deleteTag(trx: TenantDb, ctx: RequestContext, ref: TagRef): Promise<void> {
  const { post_count } = await readTag(trx, ref);
  await trx
    .deleteFrom('tags')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.tagId)
    .execute();
  const args = { post_count: Number(post_count) };
  await audit(trx, ctx, { ref, action: 'tag.deleted', args });
}
