import { encodePublicId, toDate } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../base/http/errors.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { actAs, OwnerLost } from '../../flow/posts/owner/owner.ts';
import { auditFeed, type FeedRef } from './audit.ts';
import type { FeedError, Fetched } from './fetch.ts';
import { CONTENT_ERRORS, type FeedChannel, type PostingFeed, postItem } from './item.ts';
import type { FeedItem } from './parse.ts';
import { revisitRequests } from './revisit.ts';
import { recordItem, type SeenAt, touchAll, touchKnown } from './seen.ts';

const PER_CHECK = 5;
const FAILING_HOURS = 24;
const SYSTEM: Actor = { kind: 'system' };
const EPOCH = Temporal.Instant.fromEpochMilliseconds(0);

export interface Settling {
  readonly providers: ProviderRegistry;
  readonly logger: Logger;
  readonly now: Temporal.Instant;
  readonly ref: FeedRef;
  readonly url: string;
}

export type CheckOutcome = 'skipped' | 'not_modified' | 'checked' | 'failed' | 'paused';

interface LockedFeed extends PostingFeed {
  readonly failing_since: Date | null;
}

async function lockFeed(trx: TenantDb, settling: Settling): Promise<LockedFeed | null> {
  const { ref } = settling;
  const feed = await trx
    .selectFrom('rss_feeds')
    .select(['owner_user_id', 'mode', 'template', 'failing_since'])
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.feedId)
    .where('state', '=', 'active')
    .where('url', '=', settling.url)
    .forUpdate()
    .executeTakeFirst();
  if (feed === undefined) return null;
  const channels: FeedChannel[] = await trx
    .selectFrom('rss_feed_channels as c')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'c.workspace_id').onRef('a.id', '=', 'c.social_account_id'),
    )
    .select(['a.id', 'a.provider', 'a.capabilities'])
    .where('c.workspace_id', '=', ref.workspaceId)
    .where('c.feed_id', '=', ref.feedId)
    .orderBy('a.id')
    .execute();
  return { ...feed, channels };
}

function feedUpdate(trx: TenantDb, ref: FeedRef) {
  return trx
    .updateTable('rss_feeds')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.feedId);
}

async function pause(trx: TenantDb, ref: FeedRef, reason: 'owner_lost' | 'fetch_failing') {
  await feedUpdate(trx, ref)
    .set({ state: 'paused', paused_reason: reason, updated_at: sql<Date>`now()` })
    .execute();
  await auditFeed(trx, null, { ref, action: 'rss_feed.paused', args: { reason } });
}

async function recordFailure(trx: TenantDb, s: Settling, feed: LockedFeed, kind: FeedError) {
  const since = feed.failing_since ?? toDate(s.now);
  const limit = s.now.subtract({ hours: FAILING_HOURS });
  await feedUpdate(trx, s.ref)
    .set({ last_error: kind, failing_since: since, last_checked_at: toDate(s.now) })
    .execute();
  const log = { task: 'rss', feed: encodePublicId('rssFeed', s.ref.feedId), kind };
  s.logger.warn(log, 'an RSS feed could not be checked');
  const started = Temporal.Instant.fromEpochMilliseconds(since.getTime());
  if (Temporal.Instant.compare(started, limit) > 0) return 'failed';
  await pause(trx, s.ref, 'fetch_failing');
  return 'paused';
}

function pickNew(found: readonly FeedItem[], known: ReadonlySet<string>, budget: number) {
  const fresh = found.filter((item) => !known.has(item.key.toString('hex')));
  const dated = fresh.every((item) => item.at !== null);
  const ordered = dated
    ? [...fresh].sort((a, b) => Temporal.Instant.compare(a.at ?? EPOCH, b.at ?? EPOCH))
    : fresh;
  return { picked: ordered.slice(0, budget), waiting: ordered.length > budget };
}

type ItemResult = 'done' | 'retry' | 'owner_lost';

async function postOne(trx: TenantDb, s: Settling, feed: LockedFeed, item: FeedItem) {
  const seen: SeenAt = { ...s.ref, at: toDate(s.now) };
  const env = { providers: s.providers, now: s.now, workspaceId: s.ref.workspaceId };
  await sql`savepoint rss_item`.execute(trx);
  try {
    const post = await postItem(trx, env, feed, item);
    await recordItem(trx, seen, { key: item.key, ...post });
    await sql`release savepoint rss_item`.execute(trx);
    await actAs(trx, SYSTEM);
    return 'done';
  } catch (err) {
    await sql`rollback to savepoint rss_item`.execute(trx);
    await actAs(trx, SYSTEM);
    if (err instanceof OwnerLost) return 'owner_lost';
    if (err instanceof HttpError && CONTENT_ERRORS.has(err.code)) {
      await recordItem(trx, seen, {
        key: item.key,
        outcome: 'failed',
        errorCode: err.code,
        postId: null,
      });
      return 'done';
    }
    const log = { task: 'rss', feed: encodePublicId('rssFeed', s.ref.feedId) };
    s.logger.error(log, 'an RSS item could not be posted');
    return 'retry';
  }
}

interface Budgeted {
  readonly feed: LockedFeed;
  readonly budget: number;
}

async function postNew(
  trx: TenantDb,
  s: Settling,
  { feed, budget }: Budgeted,
  found: readonly FeedItem[],
) {
  const known = await touchKnown(trx, { ...s.ref, at: toDate(s.now) }, found);
  const { picked, waiting } = pickNew(found, known, budget);
  let complete = !waiting;
  for (const item of picked) {
    const result: ItemResult = await postOne(trx, s, feed, item);
    if (result === 'owner_lost') {
      await pause(trx, s.ref, 'owner_lost');
      return { complete: false, paused: true };
    }
    if (result === 'retry') complete = false;
  }
  return { complete, paused: false };
}

// Validators are kept only once every new item is recorded; a 304 would hide the rest.
async function settleFetched(trx: TenantDb, s: Settling, budgeted: Budgeted, fetched: Fetched) {
  const at = toDate(s.now);
  const healthy = { last_checked_at: at, last_error: null, failing_since: null };
  if (fetched.kind === 'not_modified') {
    await touchAll(trx, { ...s.ref, at });
    await feedUpdate(trx, s.ref).set(healthy).execute();
    return 'not_modified';
  }
  const { complete, paused } = await postNew(trx, s, budgeted, fetched.items);
  const validators = complete
    ? { etag: fetched.etag, last_modified: fetched.lastModified }
    : { etag: null, last_modified: null };
  await feedUpdate(trx, s.ref)
    .set({ ...healthy, ...validators })
    .execute();
  return paused ? 'paused' : 'checked';
}

// Requests waiting for approval come first, so an approved post isn't overtaken by newer items.
function revisit(trx: TenantDb, s: Settling, feed: LockedFeed) {
  if (feed.mode !== 'queue') return Promise.resolve({ acted: 0, ownerLost: false });
  const env = { providers: s.providers, now: s.now, workspaceId: s.ref.workspaceId };
  return revisitRequests(trx, { env, ref: s.ref, feed, budget: PER_CHECK, logger: s.logger });
}

export async function settleCheck(
  trx: TenantDb,
  s: Settling,
  fetched: Fetched | FeedError,
): Promise<CheckOutcome> {
  const feed = await lockFeed(trx, s);
  if (feed === null) return 'skipped';
  const { acted, ownerLost } = await revisit(trx, s, feed);
  if (ownerLost) {
    await pause(trx, s.ref, 'owner_lost');
    return 'paused';
  }
  if (typeof fetched === 'string') return await recordFailure(trx, s, feed, fetched);
  return await settleFetched(trx, s, { feed, budget: PER_CHECK - acted }, fetched);
}
