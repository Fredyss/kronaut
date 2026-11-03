import { type DocJson, toPlainText } from '@kronaut/compose';
import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

const EXCERPT_GRAPHEMES = 140;
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

export function visibleIn(scope: AccessScope) {
  const accounts = anyOf(scope.socialAccountIds);
  const brands = anyOf(scope.brandIds);
  const locations = anyOf(scope.locationIds);
  return sql<boolean>`(
    (p.brand_id IS NULL OR coalesce(p.brand_id = ANY(${brands}) OR p.location_id = ANY(${locations}), false))
    AND (p.brand_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM post_destinations s WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id))
    AND NOT EXISTS (
      SELECT 1 FROM post_destinations s
      JOIN social_accounts a ON a.workspace_id = s.workspace_id AND a.id = s.social_account_id
      WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id
        AND NOT coalesce(a.id = ANY(${accounts}) OR a.brand_id = ANY(${brands})
          OR a.location_id = ANY(${locations}), false)))`;
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
