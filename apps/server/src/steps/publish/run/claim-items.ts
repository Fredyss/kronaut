import { createHash } from 'node:crypto';
import type { PostTypeSpec, PublishItem } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { DestinationJob } from '../../../infrastructure/jobs/jobs.ts';
import { frozenSkips } from '../chain.ts';

function sha256(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

export interface ItemPlan {
  readonly items: readonly PublishItem[];
  readonly postType: PostTypeSpec;
  render(): Promise<ReadonlyMap<number, string>>;
}

export async function resetItems(
  trx: TenantDb,
  job: DestinationJob,
  { items, postType, render }: ItemPlan,
): Promise<void> {
  const existingItem = await trx
    .selectFrom('destination_items')
    .select('position')
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .executeTakeFirst();
  if (existingItem !== undefined) {
    await trx
      .updateTable('destination_items')
      .set({ state: 'pending' })
      .where('workspace_id', '=', job.workspaceId)
      .where('destination_id', '=', job.id)
      .where('state', 'in', ['sending', 'unconfirmed', 'failed'])
      .execute();
    return;
  }
  const skipped = frozenSkips(postType, items);
  const texts = await render();
  await trx
    .insertInto('destination_items')
    .values(
      items.map((item) => {
        const text = (texts.get(item.position) ?? item.text).normalize('NFC');
        return {
          workspace_id: job.workspaceId,
          destination_id: job.id,
          position: item.position,
          role: item.role,
          state: skipped.has(item.position) ? 'skipped' : 'pending',
          rendered_text: text,
          rendered_sha256: sha256(text),
        };
      }),
    )
    .execute();
}
