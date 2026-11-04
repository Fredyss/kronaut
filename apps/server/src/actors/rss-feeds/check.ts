import { encodePublicId } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import type { Task } from 'graphile-worker';
import * as z from 'zod';
import type { FeedJob } from '../../infrastructure/jobs/jobs.ts';
import type { JobDeps } from '../../infrastructure/jobs/workspace-sweep.ts';
import { classifyFeedFailure, type FeedError, type Fetched, fetchFeed } from './fetch.ts';
import { type CheckOutcome, settleCheck } from './settle.ts';

const SYSTEM: Actor = { kind: 'system' };

const PayloadSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

export interface FeedCheckDeps extends JobDeps {
  readonly http: HttpClient;
}

function dueFeed(deps: FeedCheckDeps, job: FeedJob) {
  return deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('rss_feeds')
      .select(['url', 'etag', 'last_modified'])
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .where('state', '=', 'active')
      .executeTakeFirst(),
  );
}

type Due = NonNullable<Awaited<ReturnType<typeof dueFeed>>>;

async function fetchOrFail(deps: FeedCheckDeps, due: Due): Promise<Fetched | FeedError> {
  try {
    return await fetchFeed(deps.http, due.url, {
      etag: due.etag,
      lastModified: due.last_modified,
    });
  } catch (error) {
    return classifyFeedFailure(error);
  }
}

export async function checkFeed(deps: FeedCheckDeps, job: FeedJob): Promise<CheckOutcome> {
  const due = await dueFeed(deps, job);
  if (due === undefined) return 'skipped';
  const fetched = await fetchOrFail(deps, due);
  const settling = {
    providers: deps.providers,
    logger: deps.logger,
    now: deps.now(),
    ref: { workspaceId: job.workspaceId, feedId: job.id },
    url: due.url,
  };
  return await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    settleCheck(trx, settling, fetched),
  );
}

// Whatever is thrown here lands in graphile's last_error, so it never carries a message of its own.
export function feedCheckTask(deps: FeedCheckDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('rss job payload is invalid');
      return;
    }
    try {
      await checkFeed(deps, parsed.data);
    } catch {
      const feed = encodePublicId('rssFeed', parsed.data.id);
      deps.logger.error({ task: 'rss', feed }, 'an RSS check failed');
      throw new Error('rss check failed');
    }
  };
}
