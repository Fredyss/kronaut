import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { closeRequest, type VoidReason } from '../approvals/locked.ts';
import { HttpError, type IssueDetail } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import type { PostRouteDeps } from './deps.ts';
import {
  DestinationsInput,
  type ExistingDestination,
  type ResolvedDestination,
  replaceDestinations,
  resolveDestinations,
} from './destinations.ts';
import { PostSchema, readPost } from './dto.ts';
import { type Resolving, unprocessable } from './issues.ts';
import { ItemsInput, insertItems, type ResolvedItem, resolveItems } from './items.ts';
import { bumpPost, checkVersion, lockCurrent, type PostRef } from './locks.ts';
import { pathId } from './params.ts';
import { postUnits } from './units.ts';
import {
  hasVariants,
  insertVariants,
  place,
  pruneVariants,
  resolveVariants,
  VariantsInput,
} from './variants.ts';

const EDITABLE_STATES: ReadonlySet<string> = new Set(['draft', 'canceled']);

export const postUpdateRoute = defineRoute({
  id: 'posts.update',
  method: 'PATCH',
  path: '/v1/workspaces/:workspaceId/posts/:postId',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: z.object({ workspaceId: z.string(), postId: z.string() }),
  body: z.object({
    expectedVersion: z.number().int().positive(),
    title: z.string().max(200).nullable().optional(),
    items: ItemsInput.optional(),
    variants: VariantsInput.optional(),
    destinations: DestinationsInput.optional(),
  }),
  response: PostSchema,
  idempotency: true,
  summary: 'Edit a draft post',
  description:
    'Each field given replaces that part whole; variants and destinations replace together. Every destination must be a draft or canceled.',
  tags: ['posts'],
});

type UpdateBody = z.output<typeof postUpdateRoute.body>;

interface Change {
  readonly body: UpdateBody;
  readonly items: readonly ResolvedItem[] | undefined;
  readonly variants: readonly (readonly ResolvedItem[])[];
  readonly existing: readonly ExistingDestination[];
  readonly resolved: { readonly destinations: readonly ResolvedDestination[] } | undefined;
}

async function defaultVariant(trx: TenantDb, workspaceId: string, postId: string) {
  const { id } = await trx
    .selectFrom('post_variants')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('is_default', '=', true)
    .executeTakeFirstOrThrow();
  return id;
}

async function editableDestinations(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<ExistingDestination[]> {
  const existing = await trx
    .selectFrom('post_destinations')
    .select(['id', 'social_account_id', 'publish_type', 'state', 'frozen_post_version'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .execute();
  if (existing.some((d) => !EDITABLE_STATES.has(d.state))) {
    throw new HttpError('not_editable', 'Unschedule the post before editing it.');
  }
  return existing;
}

function voidReason(body: UpdateBody, hadVariants: boolean): VoidReason | null {
  if (body.items !== undefined || body.variants !== undefined) return 'content_changed';
  if (body.destinations !== undefined)
    return hadVariants ? 'content_changed' : 'destinations_changed';
  return null;
}

async function applyChange(
  trx: TenantDb,
  post: PostRef,
  { body, items, variants, existing, resolved }: Change,
): Promise<void> {
  const { workspaceId, postId } = post;
  const variantId = await defaultVariant(trx, workspaceId, postId);
  const hadVariants = await hasVariants(trx, post);
  if (items !== undefined) {
    await trx
      .deleteFrom('variant_items')
      .where('workspace_id', '=', workspaceId)
      .where('variant_id', '=', variantId)
      .execute();
    await insertItems(trx, { ...post, variantId }, items);
  }
  if (resolved !== undefined) {
    const variantIds = await insertVariants(trx, post, variants);
    const placed = place(resolved.destinations, variantId, variantIds);
    await replaceDestinations(trx, post, existing, placed);
    await pruneVariants(trx, post);
  }
  await bumpPost(
    trx,
    workspaceId,
    postId,
    body.title === undefined ? {} : { title: body.title?.normalize('NFC') ?? null },
  );
  const reason = voidReason(body, hadVariants);
  if (reason !== null) {
    await closeRequest(trx, workspaceId, { postId }, { state: 'voided', reason });
  }
  await recordPostSettlement(trx, workspaceId, postId);
}

async function variantsOf(
  resolving: Resolving,
  body: UpdateBody,
): Promise<(readonly ResolvedItem[])[]> {
  if (body.destinations !== undefined) {
    return await resolveVariants(resolving, body.variants ?? [], body.destinations);
  }
  if (body.variants !== undefined) {
    resolving.details.push({ path: 'body.variants', code: 'variants_need_destinations' });
  }
  return [];
}

export function updateRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postUpdateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const details: IssueDetail[] = [];
        const resolving = { trx, workspaceId, details };
        const resolved =
          body.destinations === undefined
            ? undefined
            : await resolveDestinations(resolving, deps.providers, body.destinations);
        const units = [...(await postUnits(trx, workspaceId, locked)), ...(resolved?.units ?? [])];
        ctx.authorize('posts:draft', { workspaceId, postId, units });
        checkVersion(locked, body.expectedVersion);
        const existing = await editableDestinations(trx, workspaceId, postId);
        const items =
          body.items === undefined
            ? undefined
            : await resolveItems(resolving, body.items, 'body.items');
        const variants = await variantsOf(resolving, body);
        if (items === null || details.length > 0) throw unprocessable(details);

        const change = { body, items, variants, existing, resolved };
        await applyChange(trx, { workspaceId, postId }, change);
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
