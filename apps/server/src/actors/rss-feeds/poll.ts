import { toDate } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import { enqueueFeedCheck } from '../../infrastructure/jobs/jobs.ts';
import { type JobDeps, sweepCron } from '../../infrastructure/jobs/workspace-sweep.ts';
import { collectItems } from './seen.ts';

const TASK = 'rss_poll';
const CHECK_EVERY_MINUTES = 10;
const SYSTEM: Actor = { kind: 'system' };

type Counts = Record<'queued' | 'collected' | 'failed', number>;

async function pollWorkspace(deps: JobDeps, now: Temporal.Instant, counts: Counts, id: string) {
  await deps.db.withTenant(id, SYSTEM, async (trx) => {
    counts.collected += await collectItems(trx, id);
    const due = await trx
      .selectFrom('rss_feeds')
      .select('id')
      .where('workspace_id', '=', id)
      .where('state', '=', 'active')
      .where((eb) =>
        eb.or([
          eb('last_checked_at', 'is', null),
          eb('last_checked_at', '<=', toDate(now.subtract({ minutes: CHECK_EVERY_MINUTES }))),
        ]),
      )
      .orderBy('id')
      .execute();
    for (const feed of due) await enqueueFeedCheck(trx, { workspaceId: id, id: feed.id });
    counts.queued += due.length;
  });
}

export async function pollFeeds(deps: JobDeps): Promise<string> {
  const counts: Counts = { queued: 0, collected: 0, failed: 0 };
  const now = deps.now();
  return await sweepCron(deps, TASK, counts, (id) => pollWorkspace(deps, now, counts, id));
}
