import { defineRoute } from '@kronaut/contract';
import type { Principal, ScopeUnit } from '@kronaut/core';
import type { DB, TenantDb } from '@kronaut/db';
import type { Insertable } from 'kysely';
import * as z from 'zod';
import { HttpError, type IssueDetail } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import type { ProviderRegistry } from '../providers.ts';
import type { PostRouteDeps } from './deps.ts';
import { DestinationsInput, insertDestinations, resolveDestinations } from './destinations.ts';
import { PostSchema, readPost } from './dto.ts';
import { unprocessable } from './issues.ts';
import { ItemsInput, resolveItems } from './items.ts';
import { pathId } from './params.ts';
import {
  insertVariant,
  insertVariants,
  place,
  resolveVariants,
  VariantsInput,
} from './variants.ts';

export const postCreateRoute = defineRoute({
  id: 'posts.create',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({
    title: z.string().max(200).optional(),
    items: ItemsInput,
    variants: VariantsInput.optional(),
    destinations: DestinationsInput.optional(),
  }),
  response: PostSchema,
  status: 201,
  idempotency: true,
  summary: 'Create a draft post',
  tags: ['posts'],
});

type CreateBody = z.output<typeof postCreateRoute.body>;
type PostColumns = Omit<Insertable<DB['posts']>, 'workspace_id' | 'title'>;

export interface DraftSpec {
  readonly workspaceId: string;
  readonly body: CreateBody;
  readonly columns: PostColumns;
  authorize(units: readonly ScopeUnit[]): void;
}

function authorOf(principal: Principal | null) {
  if (principal?.kind === 'user') {
    return { origin: 'ui', created_by_user_id: principal.userId, created_by_grant_id: null };
  }
  if (principal?.kind === 'grant') {
    return { origin: 'api', created_by_user_id: null, created_by_grant_id: principal.grantId };
  }
  throw new HttpError('internal', 'No author is bound to this request.');
}

export async function insertDraft(
  trx: TenantDb,
  providers: ProviderRegistry,
  spec: DraftSpec,
): Promise<string> {
  const { workspaceId, body } = spec;
  const details: IssueDetail[] = [];
  const resolving = { trx, workspaceId, details };
  const listed = body.destinations ?? [];
  const { destinations, units } = await resolveDestinations(resolving, providers, listed);
  spec.authorize(units);
  const items = await resolveItems(resolving, body.items, 'body.items');
  const variants = await resolveVariants(resolving, body.variants ?? [], listed);
  if (items === null || details.length > 0) throw unprocessable(details);
  const { id: postId } = await trx
    .insertInto('posts')
    .values({
      workspace_id: workspaceId,
      title: body.title?.normalize('NFC') ?? null,
      ...spec.columns,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const ref = { workspaceId, postId };
  const defaultId = await insertVariant(trx, ref, true, items);
  const variantIds = await insertVariants(trx, ref, variants);
  await insertDestinations(trx, ref, place(destinations, defaultId, variantIds));
  return postId;
}

export function createRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const author = authorOf(ctx.principal);
      const post = await ctx.tenant(async (trx) => {
        const postId = await insertDraft(trx, deps.providers, {
          workspaceId,
          body,
          columns: { schedule_mode: 'unscheduled', ...author },
          authorize: (units) => ctx.authorize('posts:draft', { workspaceId, units }),
        });
        return await readPost(trx, workspaceId, postId);
      });
      return { status: 201, body: post };
    }),
  ];
}
