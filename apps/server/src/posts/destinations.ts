import { decodePublicId, type ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import type { ProviderRegistry } from '../providers.ts';
import type { Resolving } from './deps.ts';
import { UNFROZEN } from './freeze.ts';
import type { PostRef } from './locks.ts';
import { scopeUnit } from './units.ts';

const DestinationInput = z.object({
  accountId: z.string(),
  publishType: z.string().regex(/^[a-z0-9_]{1,40}$/),
  settings: z.record(z.string(), z.unknown()).optional(),
  deliveryMode: z.enum(['auto', 'reminder']).optional(),
  variant: z.number().int().min(0).nullable().optional(),
});

export const DestinationsInput = z.array(DestinationInput).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const [index, destination] of list.entries()) {
    const key = pairKey(destination.accountId, destination.publishType);
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: [index], message: 'duplicate destination' });
    }
    seen.add(key);
  }
});

type DestinationBody = z.output<typeof DestinationInput>;

export interface ResolvedDestination {
  readonly accountId: string;
  readonly provider: string;
  readonly accountLabel: string;
  readonly publishType: string;
  readonly settings: Record<string, unknown>;
  readonly deliveryMode: 'auto' | 'reminder';
  readonly variant: number | null;
}

export interface PlacedDestination extends ResolvedDestination {
  readonly variantId: string;
}

export interface ExistingDestination {
  readonly id: string;
  readonly social_account_id: string;
  readonly publish_type: string;
  readonly state: string;
  readonly frozen_post_version: number | null;
}

function pairKey(accountId: string, publishType: string): string {
  return `${accountId}\n${publishType}`;
}

function resolvedOf(
  account: { readonly id: string; readonly provider: string; readonly display_name: string },
  d: DestinationBody,
  settings: Record<string, unknown>,
): ResolvedDestination {
  return {
    accountId: account.id,
    provider: account.provider,
    accountLabel: account.display_name,
    publishType: d.publishType,
    settings,
    deliveryMode: d.deliveryMode ?? 'auto',
    variant: d.variant ?? null,
  };
}

export async function resolveDestinations(
  { trx, workspaceId, details }: Resolving,
  providers: ProviderRegistry,
  list: readonly DestinationBody[],
): Promise<{ destinations: ResolvedDestination[]; units: ScopeUnit[] }> {
  const ids = list.map((d) => decodePublicId('socialAccount', d.accountId));
  const known = ids.filter((id) => id !== null);
  const rows =
    known.length === 0
      ? []
      : await trx
          .selectFrom('social_accounts')
          .select(['id', 'provider', 'display_name', 'brand_id', 'location_id'])
          .where('workspace_id', '=', workspaceId)
          .where('id', 'in', known)
          .execute();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const destinations: ResolvedDestination[] = [];
  for (const [index, d] of list.entries()) {
    const path = `body.destinations.${index}`;
    const id = ids[index];
    const account = id === null || id === undefined ? undefined : byId.get(id);
    if (account === undefined) {
      details.push({ path: `${path}.accountId`, code: 'not_found' });
      continue;
    }
    const entry = providers.get(account.provider);
    if (entry === undefined) {
      details.push({ path: `${path}.accountId`, code: 'provider_unavailable' });
      continue;
    }
    if (!entry.manifest.postTypes.some((type) => type.id === d.publishType)) {
      details.push({ path: `${path}.publishType`, code: 'unsupported' });
      continue;
    }
    const settings = d.settings ?? {};
    const parsed = entry.manifest.settings.safeParse(settings);
    if (!parsed.success) {
      details.push(
        ...parsed.error.issues.map((issue) => ({
          path: [`${path}.settings`, ...issue.path.map(String)].join('.'),
          code: issue.code,
        })),
      );
      continue;
    }
    destinations.push(resolvedOf(account, d, parsed.data as Record<string, unknown>));
  }
  const units = rows.map((row) => scopeUnit(row.id, row.brand_id, row.location_id));
  return { destinations, units };
}

export type ProgressReset = (
  trx: TenantDb,
  workspaceId: string,
  destinationIds: readonly string[],
) => Promise<void>;

export async function refuseLive(
  trx: TenantDb,
  workspaceId: string,
  destinationIds: readonly string[],
): Promise<void> {
  if (destinationIds.length === 0) return;
  const live = await trx
    .selectFrom('destination_items')
    .select('destination_id')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinationIds)
    .where('state', '=', 'confirmed')
    .executeTakeFirst();
  if (live !== undefined) {
    throw new HttpError('destination_live', 'Part of this destination is already live.');
  }
}

export async function discardPublishProgress(
  trx: TenantDb,
  workspaceId: string,
  destinationIds: readonly string[],
): Promise<void> {
  if (destinationIds.length === 0) return;
  await refuseLive(trx, workspaceId, destinationIds);
  await trx
    .deleteFrom('destination_items')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinationIds)
    .execute();
}

export async function restartPublishProgress(
  trx: TenantDb,
  workspaceId: string,
  destinationIds: readonly string[],
): Promise<void> {
  if (destinationIds.length === 0) return;
  await trx
    .updateTable('destination_items')
    .set({ state: 'pending' })
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinationIds)
    .where('state', 'not in', ['confirmed', 'skipped'])
    .execute();
}

export async function insertDestinations(
  trx: TenantDb,
  { workspaceId, postId }: PostRef,
  list: readonly PlacedDestination[],
): Promise<void> {
  if (list.length === 0) return;
  await trx
    .insertInto('post_destinations')
    .values(
      list.map((d) => ({
        workspace_id: workspaceId,
        post_id: postId,
        variant_id: d.variantId,
        social_account_id: d.accountId,
        provider: d.provider,
        publish_type: d.publishType,
        delivery_mode: d.deliveryMode,
        settings: JSON.stringify(d.settings),
        selection_source: 'manual',
        account_label: d.accountLabel,
      })),
    )
    .execute();
}

export async function replaceDestinations(
  trx: TenantDb,
  post: PostRef,
  existing: readonly ExistingDestination[],
  next: readonly PlacedDestination[],
): Promise<void> {
  const { workspaceId } = post;
  const byPair = new Map(existing.map((d) => [pairKey(d.social_account_id, d.publish_type), d]));
  const wanted = new Set(next.map((d) => pairKey(d.accountId, d.publishType)));
  const removed = existing
    .filter((d) => !wanted.has(pairKey(d.social_account_id, d.publish_type)))
    .map((d) => d.id);
  const frozen = existing.filter((d) => d.frozen_post_version !== null).map((d) => d.id);
  await refuseLive(trx, workspaceId, [...removed, ...frozen]);
  if (removed.length > 0) {
    await trx
      .deleteFrom('post_destinations')
      .where('workspace_id', '=', workspaceId)
      .where('id', 'in', removed)
      .execute();
  }
  const added: PlacedDestination[] = [];
  const thawed: string[] = [];
  for (const d of next) {
    const row = byPair.get(pairKey(d.accountId, d.publishType));
    if (row === undefined) {
      added.push(d);
      continue;
    }
    if (row.frozen_post_version !== null) thawed.push(row.id);
    await trx
      .updateTable('post_destinations')
      .set({
        settings: JSON.stringify(d.settings),
        delivery_mode: d.deliveryMode,
        variant_id: d.variantId,
        ...(row.frozen_post_version === null ? {} : UNFROZEN),
        ...(row.state === 'canceled'
          ? { state: 'draft', state_reason: null, version: sql<number>`version + 1` }
          : {}),
      })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', row.id)
      .execute();
  }
  await discardPublishProgress(trx, workspaceId, thawed);
  await insertDestinations(trx, post, added);
}
