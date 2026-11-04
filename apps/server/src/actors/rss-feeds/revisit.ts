import { encodePublicId } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { lockCurrent } from '../../access/post-access/locks.ts';
import { postUnits } from '../../access/post-access/units.ts';
import { actAs, OwnerLost, ownerActing } from '../../flow/posts/owner/owner.ts';
import {
  newestRequest,
  type OwnerEnv,
  QUEUE,
  scheduleOrRequest,
} from '../../flow/posts/owner/owner-schedule.ts';
import type { FeedRef } from './audit.ts';
import { type ItemPost, type PostingFeed, scheduleOrKeep } from './item.ts';
import type { ItemOutcome } from './seen.ts';

const SYSTEM: Actor = { kind: 'system' };
const CLOSED: ReadonlySet<string> = new Set(['rejected', 'voided', 'withdrawn']);

export interface Revisit {
  readonly env: OwnerEnv;
  readonly ref: FeedRef;
  readonly feed: PostingFeed;
  readonly budget: number;
  readonly logger: { error(fields: object, message: string): void };
}

export interface Revisited {
  readonly acted: number;
  readonly ownerLost: boolean;
}

interface Waiting {
  readonly key: Buffer;
  readonly post_id: string;
  readonly publish_summary: string;
}

function waitingItems(trx: TenantDb, ref: FeedRef): Promise<Waiting[]> {
  return trx
    .selectFrom('rss_items as i')
    .innerJoin('posts as p', (join) =>
      join.onRef('p.workspace_id', '=', 'i.workspace_id').onRef('p.id', '=', 'i.post_id'),
    )
    .select(['i.key', 'p.id as post_id', 'p.publish_summary'])
    .where('i.workspace_id', '=', ref.workspaceId)
    .where('i.feed_id', '=', ref.feedId)
    .where('i.outcome', '=', 'requested')
    .where('p.deleted_at', 'is', null)
    .orderBy('i.created_at')
    .orderBy('i.key')
    .execute();
}

async function setOutcome(
  trx: TenantDb,
  ref: FeedRef,
  key: Buffer,
  post: Omit<ItemPost, 'postId'>,
) {
  await trx
    .updateTable('rss_items')
    .set({ outcome: post.outcome, error_code: post.errorCode })
    .where('workspace_id', '=', ref.workspaceId)
    .where('feed_id', '=', ref.feedId)
    .where('key', '=', key)
    .execute();
}

async function scheduleApproved(trx: TenantDb, r: Revisit, item: Waiting): Promise<ItemPost> {
  const { env } = r;
  const acting = await ownerActing(
    trx,
    env.workspaceId,
    { ...r.feed, owner_grant_id: null },
    env.now,
  );
  const locked = await lockCurrent(trx, env.workspaceId, item.post_id);
  const units = await postUnits(trx, env.workspaceId, locked);
  acting.decide(
    'posts:schedule',
    { workspaceId: env.workspaceId, postId: locked.id, units },
    'approved',
  );
  await actAs(trx, acting.actor);
  const turn = { env, acting, locked, units };
  return await scheduleOrKeep(trx, locked.id, () => scheduleOrRequest(trx, turn, QUEUE));
}

// Only an approval is acted on; a request someone closed leaves the post a draft to follow up by hand.
async function settled(
  trx: TenantDb,
  r: Revisit,
  item: Waiting,
): Promise<ItemOutcome | ItemPost | null> {
  const newest = await newestRequest(trx, r.env.workspaceId, item.post_id);
  if (newest !== undefined && CLOSED.has(newest.state)) return 'drafted';
  if (newest?.state !== 'approved') return null;
  if (item.publish_summary !== 'draft') return 'scheduled';
  return await scheduleApproved(trx, r, item);
}

async function revisitOne(
  trx: TenantDb,
  r: Revisit,
  item: Waiting,
): Promise<'acted' | 'idle' | 'owner_lost'> {
  await sql`savepoint rss_revisit`.execute(trx);
  try {
    const result = await settled(trx, r, item);
    if (result !== null) {
      const post = typeof result === 'string' ? { outcome: result, errorCode: null } : result;
      await setOutcome(trx, r.ref, item.key, post);
    }
    await sql`release savepoint rss_revisit`.execute(trx);
    await actAs(trx, SYSTEM);
    return result === null ? 'idle' : 'acted';
  } catch (err) {
    await sql`rollback to savepoint rss_revisit`.execute(trx);
    await actAs(trx, SYSTEM);
    if (err instanceof OwnerLost) return 'owner_lost';
    r.logger.error(
      { task: 'rss', feed: encodePublicId('rssFeed', r.ref.feedId) },
      'an RSS request could not be revisited',
    );
    return 'idle';
  }
}

export async function revisitRequests(trx: TenantDb, r: Revisit): Promise<Revisited> {
  let acted = 0;
  for (const item of await waitingItems(trx, r.ref)) {
    if (acted >= r.budget) break;
    const result = await revisitOne(trx, r, item);
    if (result === 'owner_lost') return { acted, ownerLost: true };
    if (result === 'acted') acted++;
  }
  return { acted, ownerLost: false };
}
