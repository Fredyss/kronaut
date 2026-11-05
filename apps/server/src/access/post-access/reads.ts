import { type DocJson, toPlainText } from '@kronaut/compose';
import { type AccessScope, decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

const EXCERPT_GRAPHEMES = 140;
const NO_BRAND = 'none';
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function excerptOf(doc: DocJson): string {
  const text = toPlainText(doc).replaceAll('\n', ' ').trim().normalize('NFC');
  let count = 0;
  for (const { index } of SEGMENTER.segment(text)) {
    if (count === EXCERPT_GRAPHEMES) return `${text.slice(0, index)}…`;
    count += 1;
  }
  return text;
}

function anyOf(ids: readonly string[]) {
  return sql`${[...ids]}::uuid[]`;
}

export function accountInScope(scope: AccessScope) {
  return sql<boolean>`(a.id = ANY(${anyOf(scope.socialAccountIds)})
    OR a.brand_id = ANY(${anyOf(scope.brandIds)}) OR a.location_id = ANY(${anyOf(scope.locationIds)}))`;
}

export function visibleIn(scope: AccessScope) {
  return sql<boolean>`(
    EXISTS (SELECT 1 FROM post_destinations s WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM post_destinations s
      JOIN social_accounts a ON a.workspace_id = s.workspace_id AND a.id = s.social_account_id
      WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id
        AND NOT coalesce(${accountInScope(scope)}, false)))`;
}

type BrandFilter = { readonly brandId: string | null } | 'unknown' | undefined;

export function brandFilter(param: string | undefined): BrandFilter {
  if (param === undefined) return undefined;
  if (param === NO_BRAND) return { brandId: null };
  const brandId = decodePublicId('brand', param);
  return brandId === null ? 'unknown' : { brandId };
}

export function onBrand(brandId: string | null) {
  const match = brandId === null ? sql`a.brand_id IS NULL` : sql`a.brand_id = ${brandId}`;
  return sql<boolean>`EXISTS (
    SELECT 1 FROM post_destinations s
    JOIN social_accounts a ON a.workspace_id = s.workspace_id AND a.id = s.social_account_id
    WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id AND s.state <> 'canceled' AND ${match})`;
}

type GroupFilter = { readonly groupId: string } | 'unknown' | undefined;

export function groupFilter(param: string | undefined): GroupFilter {
  if (param === undefined) return undefined;
  const groupId = decodePublicId('group', param);
  return groupId === null ? 'unknown' : { groupId };
}

export function onGroup(groupId: string) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM post_destinations s
    JOIN account_group_members m ON m.workspace_id = s.workspace_id AND m.social_account_id = s.social_account_id
    WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id AND s.state <> 'canceled'
      AND m.group_id = ${groupId})`;
}

export async function loadMains(trx: TenantDb, workspaceId: string, ids: readonly string[]) {
  return await trx
    .selectFrom('variant_items as i')
    .innerJoin('post_variants as v', (join) =>
      join.onRef('v.workspace_id', '=', 'i.workspace_id').onRef('v.id', '=', 'i.variant_id'),
    )
    .select((eb) => [
      'i.post_id',
      'i.doc',
      eb
        .selectFrom('item_media as m')
        .select(eb.fn.countAll<string>().as('n'))
        .whereRef('m.workspace_id', '=', 'i.workspace_id')
        .whereRef('m.item_id', '=', 'i.id')
        .as('media_count'),
    ])
    .where('i.workspace_id', '=', workspaceId)
    .where('i.post_id', 'in', ids)
    .where('i.role', '=', 'main')
    .where('v.is_default', '=', true)
    .execute();
}
