import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import {
  createSavedText,
  deleteSavedText,
  listSavedTexts,
  NAME_MAX,
  type SavedTextRef,
  savedTextDto,
  TEXT_MAX,
  updateSavedText,
  WORKSPACE_MAX,
} from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/saved-texts';
const SAVED_TEXT_PATH = `${PATH}/:savedTextId`;

const WorkspaceParams = z.object({ workspaceId: z.string() });
const SavedTextParams = z.object({ workspaceId: z.string(), savedTextId: z.string() });
const Doc = z.record(z.string(), z.unknown());
const SavedTextSchema = z.object({ id: z.string(), name: z.string(), doc: Doc });

export const savedTextListRoute = defineRoute({
  id: 'saved_texts.list',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: WorkspaceParams,
  response: z.object({ items: z.array(SavedTextSchema) }),
  summary: 'List saved texts',
  description: "The workspace's saved texts by name.",
  tags: ['posts'],
});

export const savedTextCreateRoute = defineRoute({
  id: 'saved_texts.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  body: z.strictObject({ name: z.string(), doc: Doc }),
  response: SavedTextSchema,
  status: 201,
  idempotency: true,
  summary: 'Create a saved text',
  description: `The name is trimmed and has 1–${NAME_MAX} characters (422 saved_text_name_invalid). The doc holds plain paragraphs of 1–${TEXT_MAX} characters (422 saved_text_invalid). A name that differs only in case is 409 saved_text_exists; a workspace has at most ${WORKSPACE_MAX} saved texts (409 saved_text_limit). Owners and admins only.`,
  tags: ['posts'],
});

export const savedTextUpdateRoute = defineRoute({
  id: 'saved_texts.update',
  method: 'PATCH',
  path: SAVED_TEXT_PATH,
  auth: 'session',
  action: 'settings:write',
  params: SavedTextParams,
  body: z.strictObject({ name: z.string().optional(), doc: Doc.optional() }),
  response: SavedTextSchema,
  idempotency: true,
  summary: 'Update a saved text',
  description:
    'The name and doc follow the same rules as when creating one. Posts that already used the text keep theirs. Owners and admins only.',
  tags: ['posts'],
});

export const savedTextDeleteRoute = defineRoute({
  id: 'saved_texts.delete',
  method: 'DELETE',
  path: SAVED_TEXT_PATH,
  auth: 'session',
  action: 'settings:write',
  params: SavedTextParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete a saved text',
  description: 'Posts that already used the text keep theirs. Owners and admins only.',
  tags: ['posts'],
});

function savedTextRef(params: z.output<typeof SavedTextParams>): SavedTextRef {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    savedTextId: pathId('savedText', params.savedTextId),
  };
}

function savedTextBody(row: Parameters<typeof savedTextDto>[0]) {
  return SavedTextSchema.parse(savedTextDto(row));
}

export function savedTextRoutes(): BoundRoute[] {
  return [
    bindRoute(savedTextListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('posts:read', { workspaceId });
      const rows = await ctx.tenant((trx) => listSavedTexts(trx, workspaceId));
      return { body: { items: rows.map(savedTextBody) } };
    }),
    bindRoute(savedTextCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      const row = await ctx.tenant((trx) => createSavedText(trx, ctx, workspaceId, body));
      return { status: 201, body: savedTextBody(row) };
    }),
    bindRoute(savedTextUpdateRoute, async ({ params, body }, ctx) => {
      const ref = savedTextRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      const row = await ctx.tenant((trx) => updateSavedText(trx, ctx, ref, body));
      return { body: savedTextBody(row) };
    }),
    bindRoute(savedTextDeleteRoute, async ({ params }, ctx) => {
      const ref = savedTextRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      await ctx.tenant((trx) => deleteSavedText(trx, ctx, ref));
      return { body: undefined };
    }),
  ];
}
