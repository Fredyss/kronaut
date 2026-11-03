import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/request.ts';
import type { ProviderRegistry } from '../providers/providers.ts';
import { importPosts } from './import-posts.ts';
import { ImportInput, ImportResult } from './input.ts';

export interface PostImportRouteDeps {
  readonly providers: ProviderRegistry;
}

export const postImportRoute = defineRoute({
  id: 'posts.import',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/post-imports',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: z.object({ workspaceId: z.string() }),
  body: ImportInput,
  response: ImportResult,
  status: 201,
  idempotency: true,
  summary: 'Import posts',
  description:
    'Creates one post per row, in order, and schedules it at a local time in a time zone or at the next free slot of each channel queue. When approval is needed, the post stays a draft and an approval request opens instead, bound to the row time if it has one. All rows succeed or none: 422 lists every problem with a path under body.rows.<index>. With dryRun the import runs and is rolled back, and the answer is 200 with no post ids.',
  tags: ['posts'],
});

export function postImportRoutes(deps: PostImportRouteDeps): BoundRoute[] {
  return [
    bindRoute(postImportRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const env = { ctx, providers: deps.providers, workspaceId };
      const result = await ctx.tenant((trx) => importPosts(trx, env, body));
      return { status: body.dryRun === true ? 200 : 201, body: result };
    }),
  ];
}
