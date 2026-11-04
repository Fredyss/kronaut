import { encodePublicId, toDate } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../base/http/errors.ts';
import { actAs, OwnerLost } from '../../flow/posts/owner/owner.ts';
import type { FeedRef } from './audit.ts';
import { CONTENT_ERRORS } from './item.ts';
import { type ItemRecord, recordItem, type SeenAt } from './seen.ts';

const MAX_ATTEMPTS = 3;
const SYSTEM: Actor = { kind: 'system' };

export type ItemResult = 'done' | 'fetching' | 'retry' | 'owner_lost';

export interface Attempting {
  readonly logger: Logger;
  readonly now: Temporal.Instant;
  readonly ref: FeedRef;
}

export interface Attempt {
  readonly key: Buffer;
  readonly prior: number;
}

async function retryLater(trx: TenantDb, seen: SeenAt, { key, prior }: Attempt) {
  const attempts = prior + 1;
  const done = attempts >= MAX_ATTEMPTS;
  await recordItem(trx, seen, {
    key,
    outcome: done ? 'failed' : 'retrying',
    errorCode: done ? 'item_failed' : null,
    postId: null,
    attempts,
  });
  return done ? 'done' : 'retry';
}

async function failed(trx: TenantDb, s: Attempting, attempt: Attempt, err: unknown) {
  const seen: SeenAt = { ...s.ref, at: toDate(s.now) };
  if (err instanceof HttpError && CONTENT_ERRORS.has(err.code)) {
    const { key, prior } = attempt;
    await recordItem(trx, seen, {
      key,
      outcome: 'failed',
      errorCode: err.code,
      postId: null,
      attempts: prior,
    });
    return 'done';
  }
  const log = { task: 'rss', feed: encodePublicId('rssFeed', s.ref.feedId) };
  s.logger.error(log, 'an RSS item could not be posted');
  return await retryLater(trx, seen, attempt);
}

export async function attemptItem(
  trx: TenantDb,
  s: Attempting,
  attempt: Attempt,
  run: () => Promise<Omit<ItemRecord, 'key' | 'attempts'>>,
): Promise<ItemResult> {
  await sql`savepoint rss_item`.execute(trx);
  try {
    const record = await run();
    const seen: SeenAt = { ...s.ref, at: toDate(s.now) };
    await recordItem(trx, seen, { ...record, key: attempt.key, attempts: attempt.prior });
    await sql`release savepoint rss_item`.execute(trx);
    await actAs(trx, SYSTEM);
    return record.outcome === 'fetching_media' ? 'fetching' : 'done';
  } catch (err) {
    await sql`rollback to savepoint rss_item`.execute(trx);
    await actAs(trx, SYSTEM);
    if (err instanceof OwnerLost) return 'owner_lost';
    return await failed(trx, s, attempt, err);
  }
}
