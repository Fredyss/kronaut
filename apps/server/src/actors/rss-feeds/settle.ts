import { encodePublicId, toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { enqueueFeedCheck } from '../../infrastructure/jobs/jobs.ts';
import { type Attempt, attemptItem } from './attempt.ts';
import { auditFeed, type FeedRef } from './audit.ts';
import type { FeedError, Fetched } from './fetch.ts';
import { type PostingFeed, postItem } from './item.ts';
import { hasPending, pendingItems, pendingMedia, startImport } from './media-item.ts';
import type { FeedItem } from './parse.ts';
import type { FeedChannel } from './pick.ts';
import { revisitRequests } from './revisit.ts';
import { type Known, touchAll, touchKnown } from './seen.ts';
import { renderText } from './template.ts';

const PER_CHECK = 5;
const REQUEUE_MINUTES = 2;
const FAILING_HOURS = 24;
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

// Feeds list newest first, so without a date on every item the reverse feed order is the oldest first.
function pickNew(found: readonly FeedItem[], known: Known, budget: number) {
  const fresh = found.filter((item) => !known.settled.has(item.key.toString('hex')));
  const dated = fresh.every((item) => item.at !== null);
  const ordered = dated
    ? [...fresh].sort((a, b) => Temporal.Instant.compare(a.at ?? EPOCH, b.at ?? EPOCH))
    : [...fresh].sort((a, b) => b.index - a.index);
  return { picked: ordered.slice(0, budget), waiting: ordered.length > budget };
}

function envOf(s: Settling) {
  return { providers: s.providers, now: s.now, workspaceId: s.ref.workspaceId };
}

function postFound(
  trx: TenantDb,
  s: Settling,
  feed: LockedFeed,
  attempt: Attempt & { item: FeedItem },
) {
  const { item } = attempt;
  return attemptItem(trx, s, attempt, async () => {
    const text = renderText(feed.template, item);
    const env = envOf(s);
    const fetching =
      item.image === null ? null : await startImport(trx, env, feed, { image: item.image, text });
    if (fetching === null) return await postItem(trx, env, feed, { text, media: null });
    return { outcome: 'fetching_media', errorCode: null, postId: null, fetching };
  });
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
    const prior = known.attempts.get(item.key.toString('hex')) ?? 0;
    const result = await postFound(trx, s, feed, { key: item.key, prior, item });
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

function revisit(trx: TenantDb, s: Settling, feed: LockedFeed) {
  if (feed.mode !== 'queue') return Promise.resolve({ acted: 0, ownerLost: false });
  return revisitRequests(trx, {
    env: envOf(s),
    ref: s.ref,
    feed,
    budget: PER_CHECK,
    logger: s.logger,
  });
}

async function settlePending(trx: TenantDb, s: Settling, feed: LockedFeed, budget: number) {
  const rows = budget > 0 ? await pendingItems(trx, s.ref, budget) : [];
  for (const row of rows) {
    const media = pendingMedia(row, s.now);
    if (media === 'wait') continue;
    const attempt = { key: row.key, prior: row.attempts };
    const content = { text: row.text ?? '', media };
    const result = await attemptItem(trx, s, attempt, () => postItem(trx, envOf(s), feed, content));
    if (result === 'owner_lost') return { used: rows.length, ownerLost: true };
  }
  return { used: rows.length, ownerLost: false };
}

async function ownerLost(trx: TenantDb, s: Settling): Promise<CheckOutcome> {
  await pause(trx, s.ref, 'owner_lost');
  return 'paused';
}

// Revisited requests and images still being fetched come first, so newer items can't overtake them.
export async function settleCheck(
  trx: TenantDb,
  s: Settling,
  fetched: Fetched | FeedError,
): Promise<CheckOutcome> {
  const feed = await lockFeed(trx, s);
  if (feed === null) return 'skipped';
  const revisited = await revisit(trx, s, feed);
  if (revisited.ownerLost) return await ownerLost(trx, s);
  const pending = await settlePending(trx, s, feed, PER_CHECK - revisited.acted);
  if (pending.ownerLost) return await ownerLost(trx, s);
  const budget = PER_CHECK - revisited.acted - pending.used;
  const outcome =
    typeof fetched === 'string'
      ? await recordFailure(trx, s, feed, fetched)
      : await settleFetched(trx, s, { feed, budget }, fetched);
  if (outcome !== 'paused' && (await hasPending(trx, s.ref))) {
    const job = { workspaceId: s.ref.workspaceId, id: s.ref.feedId };
    await enqueueFeedCheck(trx, job, toDate(s.now.add({ minutes: REQUEUE_MINUTES })));
  }
  return outcome;
}
