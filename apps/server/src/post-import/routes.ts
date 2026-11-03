import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/request.ts';
import type { ProviderRegistry } from '../providers/providers.ts';
import { checkImport, importPosts } from './import-posts.ts';
import { ImportCheckResult, ImportInput, ImportResult } from './input.ts';

export interface PostImportRouteDeps {
  readonly providers: ProviderRegistry;
}

const Params = z.object({ workspaceId: z.string() });

export const postImportRoute = defineRoute({
  id: 'posts.import',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/post-imports',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: Params,
  body: ImportInput,
  response: ImportResult,
  status: 201,
  idempotency: true,
  summary: 'Import posts',
  description:
    'Creates one post per row, in order, and schedules it at a local time in a time zone or at the next free slot of each channel queue. When approval is needed, the post stays a draft and an approval request opens instead, bound to the row time if it has one; a queue row is then scheduled by hand after approval. All rows succeed or none: 422 lists every problem with a path under body.rows.<index>.',
  tags: ['posts'],
});

export const postImportCheckRoute = defineRoute({
  id: 'posts.import_check',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/post-imports/checks',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: Params,
  body: ImportInput,
  response: ImportCheckResult,
  idempotency: false,
  summary: 'Check a post import',
  description:
    'Runs an import exactly as posts.import would and rolls it back: nothing is created. Answers each row with the outcome it would have, or 422 with the same problems.',
  tags: ['posts'],
});

export function postImportRoutes(deps: PostImportRouteDeps): BoundRoute[] {
  return [
    bindRoute(postImportRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const env = { ctx, providers: deps.providers, workspaceId };
      return { status: 201, body: await ctx.tenant((trx) => importPosts(trx, env, body)) };
    }),
    bindRoute(postImportCheckRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const env = { ctx, providers: deps.providers, workspaceId };
      return { body: await ctx.tenant((trx) => checkImport(trx, env, body)) };
    }),
  ];
}
