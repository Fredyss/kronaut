import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import type { IssueDetail } from '../http/errors.ts';
import type { Resolving } from './deps.ts';
import type { PlacedDestination, ResolvedDestination } from './destinations.ts';
import { ItemsInput, insertItems, type ResolvedItem, resolveItems } from './items.ts';
import type { PostRef } from './locks.ts';

export const VariantsInput = z.array(z.object({ items: ItemsInput })).max(50);

type VariantsBody = z.output<typeof VariantsInput>;

interface VariantPointer {
  readonly variant?: number | null | undefined;
}

function checkReferences(
  details: IssueDetail[],
  count: number,
  destinations: readonly VariantPointer[],
): void {
  const used = new Set<number>();
  for (const [index, { variant }] of destinations.entries()) {
    if (variant === undefined || variant === null) continue;
    if (variant >= count) {
      details.push({ path: `body.destinations.${index}.variant`, code: 'variant_unknown' });
    } else {
      used.add(variant);
    }
  }
  for (let index = 0; index < count; index++) {
    if (!used.has(index)) details.push({ path: `body.variants.${index}`, code: 'variant_unused' });
  }
}

export async function resolveVariants(
  resolving: Resolving,
  list: VariantsBody,
  destinations: readonly VariantPointer[],
): Promise<(readonly ResolvedItem[])[]> {
  const resolved: (readonly ResolvedItem[])[] = [];
  for (const [index, variant] of list.entries()) {
    const items = await resolveItems(resolving, variant.items, `body.variants.${index}.items`);
    if (items !== null) resolved.push(items);
  }
  checkReferences(resolving.details, list.length, destinations);
  return resolved;
}

export async function insertVariant(
  trx: TenantDb,
  post: PostRef,
  isDefault: boolean,
  items: readonly ResolvedItem[],
): Promise<string> {
  const { id } = await trx
    .insertInto('post_variants')
    .values({ workspace_id: post.workspaceId, post_id: post.postId, is_default: isDefault })
    .returning('id')
    .executeTakeFirstOrThrow();
  await insertItems(trx, { ...post, variantId: id }, items);
  return id;
}

export async function insertVariants(
  trx: TenantDb,
  post: PostRef,
  variants: readonly (readonly ResolvedItem[])[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const items of variants) ids.push(await insertVariant(trx, post, false, items));
  return ids;
}

export function place(
  destinations: readonly ResolvedDestination[],
  defaultId: string,
  variantIds: readonly string[],
): PlacedDestination[] {
  return destinations.map((d) => {
    const variantId = d.variant === null ? defaultId : variantIds[d.variant];
    if (variantId === undefined) throw new Error(`variant ${d.variant} was not inserted`);
    return { ...d, variantId };
  });
}

export async function hasVariants(trx: TenantDb, { workspaceId, postId }: PostRef) {
  const row = await trx
    .selectFrom('post_variants')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('is_default', '=', false)
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}

export async function pruneVariants(trx: TenantDb, { workspaceId, postId }: PostRef) {
  await trx
    .deleteFrom('post_variants')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('is_default', '=', false)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('post_destinations as d')
            .select('d.id')
            .whereRef('d.workspace_id', '=', 'post_variants.workspace_id')
            .whereRef('d.variant_id', '=', 'post_variants.id'),
        ),
      ),
    )
    .execute();
}
