import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { visibleIn } from '../posts/list.ts';
import { pathId } from '../posts/params.ts';
import { postTagRoutes } from './post-tags.ts';
import { BY_NAME, PostTagSchema, TAG_COLORS, tagFields } from './read.ts';

const PATH = '/v1/workspaces/:workspaceId/tags';
const TAG_PATH = `${PATH}/:tagId`;
const NAME_MAX = 40;
const WORKSPACE_MAX = 200;
const NAME_UNIQUE = 'ux_tags_name';

const WorkspaceParams = z.object({ workspaceId: z.string() });
const TagParams = z.object({ workspaceId: z.string(), tagId: z.string() });
const Color = z.enum(TAG_COLORS);
const TagSchema = PostTagSchema.extend({ postCount: z.number().int().nonnegative() });

export const tagListRoute = defineRoute({
  id: 'tags.list',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: WorkspaceParams,
  response: z.object({ items: z.array(TagSchema) }),
  summary: 'List tags',
  description: "The workspace's tags by name, with how many posts use each.",
  tags: ['posts'],
});

export const tagCreateRoute = defineRoute({
  id: 'tags.create',
  method: 'POST',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: WorkspaceParams,
  body: z.strictObject({ name: z.string(), color: Color }),
  response: TagSchema,
  status: 201,
  idempotency: true,
  summary: 'Create a tag',
  description: `The name is trimmed and has 1–${NAME_MAX} characters (422 tag_name_invalid). A name that differs only in case is 409 tag_exists; a workspace has at most ${WORKSPACE_MAX} tags (409 tag_limit).`,
  tags: ['posts'],
});

export const tagUpdateRoute = defineRoute({
  id: 'tags.update',
  method: 'PATCH',
  path: TAG_PATH,
  auth: 'session',
  action: 'settings:write',
  params: TagParams,
  body: z.strictObject({ name: z.string().optional(), color: Color.optional() }),
  response: TagSchema,
  idempotency: true,
  summary: 'Rename or recolor a tag',
  description: 'The name follows the same rules as when creating a tag. Owners and admins only.',
  tags: ['posts'],
});

export const tagDeleteRoute = defineRoute({
  id: 'tags.delete',
  method: 'DELETE',
  path: TAG_PATH,
  auth: 'session',
  action: 'settings:write',
  params: TagParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete a tag',
  description: 'Removes the tag from every post. Owners and admins only.',
  tags: ['posts'],
});

interface TagRef {
  readonly workspaceId: string;
  readonly tagId: string;
}

function tagRef(params: z.output<typeof TagParams>): TagRef {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    tagId: pathId('tag', params.tagId),
  };
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

type TagRow = Awaited<ReturnType<ReturnType<typeof tagRows>['execute']>>[number];

function tagDto(row: TagRow) {
  return TagSchema.parse({ ...tagFields(row), postCount: Number(row.post_count) });
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

async function createTag(
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

async function updateTag(
  trx: TenantDb,
  ctx: RequestContext,
  ref: TagRef,
  body: { readonly name?: string | undefined; readonly color?: string | undefined },
) {
  const current = await readTag(trx, ref);
  const name = body.name === undefined ? current.name : tagName(body.name);
  const color = body.color ?? current.color;
  if (name === current.name && color === current.color) return current;
  await uniquely(() =>
    trx
      .updateTable('tags')
      .set({ name, color, updated_at: sql`now()` })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.tagId)
      .execute(),
  );
  const args = { renamed: name !== current.name, color };
  await audit(trx, ctx, { ref, action: 'tag.updated', args });
  return await readTag(trx, ref);
}

async function deleteTag(trx: TenantDb, ctx: RequestContext, ref: TagRef): Promise<void> {
  const { post_count } = await readTag(trx, ref);
  await trx
    .deleteFrom('tags')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.tagId)
    .execute();
  const args = { post_count: Number(post_count) };
  await audit(trx, ctx, { ref, action: 'tag.deleted', args });
}

export function tagRoutes(): BoundRoute[] {
  return [
    ...postTagRoutes(),
    bindRoute(tagListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('posts:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const rows = await ctx.tenant((trx) =>
        tagRows(trx, workspaceId, scope).orderBy(BY_NAME).orderBy('t.id').execute(),
      );
      return { body: { items: rows.map(tagDto) } };
    }),
    bindRoute(tagCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('posts:draft', { workspaceId });
      const row = await ctx.tenant((trx) => createTag(trx, ctx, workspaceId, body));
      return { status: 201, body: tagDto(row) };
    }),
    bindRoute(tagUpdateRoute, async ({ params, body }, ctx) => {
      const ref = tagRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      const row = await ctx.tenant((trx) => updateTag(trx, ctx, ref, body));
      return { body: tagDto(row) };
    }),
    bindRoute(tagDeleteRoute, async ({ params }, ctx) => {
      const ref = tagRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      await ctx.tenant((trx) => deleteTag(trx, ctx, ref));
      return { body: undefined };
    }),
  ];
}
