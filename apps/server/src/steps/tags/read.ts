import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';

export const TAG_COLORS = [
  'slate',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'violet',
] as const;

export const PostTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(TAG_COLORS),
});

export interface PostTagRow {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export const BY_NAME = sql`lower(t.name)`;

export function tagFields(tag: PostTagRow) {
  return { id: encodePublicId('tag', tag.id), name: tag.name, color: tag.color };
}

export async function loadPostTags(trx: TenantDb, workspaceId: string, postIds: readonly string[]) {
  const rows = await trx
    .selectFrom('post_tags as pt')
    .innerJoin('tags as t', (join) =>
      join.onRef('t.workspace_id', '=', 'pt.workspace_id').onRef('t.id', '=', 'pt.tag_id'),
    )
    .select(['pt.post_id', 't.id', 't.name', 't.color'])
    .where('pt.workspace_id', '=', workspaceId)
    .where('pt.post_id', 'in', postIds)
    .orderBy(BY_NAME)
    .orderBy('t.id')
    .execute();
  return Map.groupBy(rows, (row) => row.post_id);
}

export async function copyPostTags(
  trx: TenantDb,
  workspaceId: string,
  sourceId: string,
  targetId: string,
): Promise<void> {
  await trx
    .insertInto('post_tags')
    .columns(['workspace_id', 'post_id', 'tag_id'])
    .expression((eb) =>
      eb
        .selectFrom('post_tags')
        .select(['workspace_id', eb.val(targetId).as('post_id'), 'tag_id'])
        .where('workspace_id', '=', workspaceId)
        .where('post_id', '=', sourceId),
    )
    .execute();
}
