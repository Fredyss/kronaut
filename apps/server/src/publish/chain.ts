import type {
  ChainLink,
  ItemAnchor,
  ItemRole,
  PostStep,
  PostTypeSpec,
  PublishItem,
} from '@kronaut/core';
import type { JsonObject, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { DestinationJob } from '../jobs/jobs.ts';

const SETTLED_ITEM_STATES: ReadonlySet<string> = new Set(['confirmed', 'skipped']);

export interface ItemRow {
  readonly position: number;
  readonly role: string;
  readonly state: string;
  readonly remote_id: string | null;
  readonly anchor: unknown;
}

export function selectItems(trx: TenantDb, job: DestinationJob): Promise<ItemRow[]> {
  return trx
    .selectFrom('destination_items')
    .select(['position', 'role', 'state', 'remote_id', 'anchor'])
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .orderBy('position')
    .execute();
}

export function currentItem(rows: readonly ItemRow[]): ItemRow | undefined {
  return rows.find((row) => !SETTLED_ITEM_STATES.has(row.state));
}

export function anchorOf(value: unknown): ItemAnchor | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(entries);
}

export function jsonb(value: unknown) {
  return sql<JsonObject>`${JSON.stringify(value ?? {})}::jsonb`;
}

export function chainBefore(rows: readonly ItemRow[], position: number): ChainLink[] {
  const links: ChainLink[] = [];
  for (const row of rows) {
    if (row.position >= position || row.state !== 'confirmed' || row.remote_id === null) continue;
    const anchor = anchorOf(row.anchor);
    links.push({
      position: row.position,
      role: row.role as ItemRole,
      remoteId: row.remote_id,
      ...(anchor === undefined ? {} : { anchor }),
    });
  }
  return links;
}

export function stepsFor(postType: PostTypeSpec, role: ItemRole): readonly PostStep[] {
  return role === 'comment' ? (postType.comment?.steps ?? []) : postType.steps;
}

export function frozenSkips(postType: PostTypeSpec, items: readonly PublishItem[]): Set<number> {
  const skipped = new Set<number>();
  let threads = 0;
  for (const item of items) {
    if (item.role === 'thread') {
      if (postType.thread === undefined || threads >= postType.thread.maxItems) {
        skipped.add(item.position);
      }
      threads++;
    } else if (item.role === 'comment' && postType.comment === undefined) {
      skipped.add(item.position);
    }
  }
  return skipped;
}

export interface CurrentInput {
  readonly item: PublishItem;
  readonly chain: readonly ChainLink[];
}

export function currentInput(
  rows: readonly ItemRow[],
  items: readonly PublishItem[],
): CurrentInput | undefined {
  const row = rows.length === 0 ? undefined : currentItem(rows);
  const position = rows.length === 0 ? items[0]?.position : row?.position;
  const item = items.find((candidate) => candidate.position === position);
  if (item === undefined) return undefined;
  return { item, chain: chainBefore(rows, item.position) };
}
