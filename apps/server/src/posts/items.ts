import { canonicalizeDoc, DOC_SCHEMA_V, DocError, type DocJson } from '@kronaut/compose';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import type { Resolving } from './issues.ts';
import type { PostRef } from './locks.ts';

const DOC_MAX_BYTES = 65536;

const ItemInput = z.object({
  doc: z.record(z.string(), z.unknown()),
  media: z
    .array(z.object({ mediaId: z.string(), altText: z.string().max(1500).nullable().optional() }))
    .max(35)
    .optional(),
});

export const ItemsInput = z.array(ItemInput).length(1);

type ItemBody = z.output<typeof ItemInput>;

export interface ResolvedItem {
  readonly doc: DocJson;
  readonly media: readonly { readonly assetId: string; readonly altText: string | null }[];
}

export interface VariantRef extends PostRef {
  readonly variantId: string;
}

async function jsonbBytes(trx: TenantDb, value: unknown): Promise<number> {
  const result = await sql<{ n: number }>`
    select octet_length(cast(${JSON.stringify(value)} as jsonb)::text) as n
  `.execute(trx);
  return result.rows[0]?.n ?? 0;
}

async function resolveDoc(
  { trx, details }: Resolving,
  item: ItemBody,
  path: string,
): Promise<DocJson | null> {
  let doc: DocJson | null = null;
  try {
    doc = canonicalizeDoc(item.doc);
  } catch (err) {
    if (!(err instanceof DocError)) throw err;
    details.push({ path: `${path}.doc`, code: err.code });
  }
  if (doc !== null && (await jsonbBytes(trx, doc)) > DOC_MAX_BYTES) {
    details.push({ path: `${path}.doc`, code: 'too_large' });
  }
  return doc;
}

async function resolveMedia(
  { trx, workspaceId, details }: Resolving,
  item: ItemBody,
  path: string,
): Promise<ResolvedItem['media']> {
  const refs = item.media ?? [];
  const ids = refs.map((ref) => decodePublicId('media', ref.mediaId));
  const known = ids.filter((id) => id !== null);
  const rows =
    known.length === 0
      ? []
      : await trx
          .selectFrom('media_assets')
          .select(['id', 'state'])
          .where('workspace_id', '=', workspaceId)
          .where('id', 'in', known)
          .where('deleted_at', 'is', null)
          .execute();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const media: { assetId: string; altText: string | null }[] = [];
  for (const [index, ref] of refs.entries()) {
    const id = ids[index];
    const row = id === null || id === undefined ? undefined : byId.get(id);
    const at = `${path}.media.${index}.mediaId`;
    if (row === undefined) details.push({ path: at, code: 'not_found' });
    else if (row.state !== 'ready') details.push({ path: at, code: 'not_ready' });
    else media.push({ assetId: row.id, altText: ref.altText?.normalize('NFC') ?? null });
  }
  return media;
}

export async function resolveItem(
  resolving: Resolving,
  item: ItemBody,
  path: string,
): Promise<ResolvedItem | null> {
  const doc = await resolveDoc(resolving, item, path);
  const media = await resolveMedia(resolving, item, path);
  return doc === null ? null : { doc, media };
}

export async function insertItem(
  trx: TenantDb,
  { workspaceId, postId, variantId }: VariantRef,
  item: ResolvedItem,
): Promise<void> {
  const { id } = await trx
    .insertInto('variant_items')
    .values({
      workspace_id: workspaceId,
      post_id: postId,
      variant_id: variantId,
      position: 0,
      role: 'main',
      doc: JSON.stringify(item.doc),
      doc_schema_v: DOC_SCHEMA_V,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  if (item.media.length === 0) return;
  await trx
    .insertInto('item_media')
    .values(
      item.media.map((m, position) => ({
        workspace_id: workspaceId,
        item_id: id,
        media_asset_id: m.assetId,
        position,
        alt_text: m.altText,
      })),
    )
    .execute();
}
