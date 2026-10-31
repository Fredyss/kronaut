import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';

export const SignatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  doc: z.record(z.string(), z.unknown()),
});

type Signature = z.input<typeof SignatureSchema>;

export async function loadSignatures(
  trx: TenantDb,
  workspaceId: string,
  savedTextIds: readonly string[],
): Promise<ReadonlyMap<string, Signature>> {
  if (savedTextIds.length === 0) return new Map();
  const rows = await trx
    .selectFrom('saved_texts')
    .select(['id', 'name', 'doc'])
    .where('workspace_id', '=', workspaceId)
    .where('id', 'in', [...new Set(savedTextIds)])
    .execute();
  return new Map(
    rows.map(({ id, name, doc }) => [
      id,
      { id: encodePublicId('savedText', id), name, doc: doc as Signature['doc'] },
    ]),
  );
}
