import { toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { closeRequest } from '../approvals/locked.ts';
import { plainLocal } from '../http/time.ts';
import { lockCurrent } from '../posts/locks.ts';
import { actAs, ownerActing } from '../posts/owner.ts';
import { newestRequest, type OwnerEnv, scheduleOrRequest } from '../posts/owner-schedule.ts';
import { postUnits } from '../posts/units.ts';
import type { ChannelScope } from './pool.ts';

const LEAD_MINUTES = 5;

function liveCopies(trx: TenantDb, scope: ChannelScope) {
  return trx
    .selectFrom('evergreen_runs as r')
    .innerJoin('posts as c', (join) =>
      join.onRef('c.workspace_id', '=', 'r.workspace_id').onRef('c.id', '=', 'r.copy_post_id'),
    )
    .where('r.workspace_id', '=', scope.workspaceId)
    .where('r.social_account_id', '=', scope.accountId)
    .where('c.deleted_at', 'is', null);
}

// Its slot is gone, so an approval could only schedule the copy at a time nobody chose.
export async function voidMissed(trx: TenantDb, scope: ChannelScope): Promise<number> {
  const missed = await liveCopies(trx, scope)
    .select('c.id')
    .where('r.slot_at', '<=', toDate(scope.now))
    .where('c.publish_summary', '=', 'in_review')
    .orderBy('c.id')
    .execute();
  for (const { id } of missed) {
    await lockCurrent(trx, scope.workspaceId, id);
    const voided = { state: 'voided', reason: 'schedule_changed' } as const;
    await closeRequest(trx, scope.workspaceId, { postId: id }, voided);
  }
  return missed.length;
}

export function waitingCopies(trx: TenantDb, scope: ChannelScope) {
  return liveCopies(trx, scope)
    .innerJoin('evergreen_posts as e', (join) =>
      join
        .onRef('e.workspace_id', '=', 'r.workspace_id')
        .onRef('e.post_id', '=', 'r.evergreen_post_id'),
    )
    .select(['e.post_id', 'e.owner_user_id', 'e.owner_grant_id', 'c.id as copy_id'])
    .select(['c.schedule_local', 'c.schedule_tz'])
    .where('e.state', '=', 'active')
    .where('c.publish_summary', '=', 'draft')
    .where('r.slot_at', '>', toDate(scope.now.add({ minutes: LEAD_MINUTES })))
    .orderBy('r.slot_at')
    .execute();
}

export type WaitingCopy = Awaited<ReturnType<typeof waitingCopies>>[number];

// A request someone rejected, withdrew or voided is theirs to follow up; only an approval is acted on.
export async function settleCopy(trx: TenantDb, env: OwnerEnv, copy: WaitingCopy) {
  const { workspaceId, now } = env;
  const scheduleLocal = plainLocal(copy.schedule_local);
  const scheduleTz = copy.schedule_tz;
  if (scheduleLocal === null || scheduleTz === null) return 'idle' as const;
  const acting = await ownerActing(trx, workspaceId, copy, now);
  const locked = await lockCurrent(trx, workspaceId, copy.copy_id);
  const units = await postUnits(trx, workspaceId, locked);
  acting.decide('posts:schedule', { workspaceId, postId: locked.id, units }, 'approved');
  await actAs(trx, acting.actor);
  const newest = await newestRequest(trx, workspaceId, locked.id);
  if (newest?.state !== 'approved') return 'idle' as const;
  return await scheduleOrRequest(
    trx,
    { env, acting, locked, units },
    { scheduleLocal, scheduleTz },
  );
}
