import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { postTagRoutes } from './post-tags.ts';
import { PostTagSchema, TAG_COLORS, tagFields } from './read.ts';
import {
  createTag,
  deleteTag,
  listTags,
  NAME_MAX,
  type TagRef,
  type TagRow,
  updateTag,
  WORKSPACE_MAX,
} from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/tags';
const TAG_PATH = `${PATH}/:tagId`;

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
  description:
    "The workspace's tags by name, with how many posts use each. A restricted principal gets only the tags used on posts it can see.",
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

function tagRef(params: z.output<typeof TagParams>): TagRef {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    tagId: pathId('tag', params.tagId),
  };
}

function tagDto(row: TagRow) {
  return TagSchema.parse({ ...tagFields(row), postCount: Number(row.post_count) });
}

export function tagRoutes(): BoundRoute[] {
  return [
    ...postTagRoutes(),
    bindRoute(tagListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('posts:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const rows = await ctx.tenant((trx) => listTags(trx, workspaceId, scope));
      const shown = scope === null ? rows : rows.filter((row) => Number(row.post_count) > 0);
      return { body: { items: shown.map(tagDto) } };
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
