import { type ApprovalStatus, authorize, type Decision, type Principal } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { effectivePolicy } from '../approvals/policy.ts';
import { type Bound, bindGrantIn, bindUserIn } from '../http/principal.ts';
import type { LockedPost } from './lock.ts';

export interface Scheduler {
  readonly userId: string | null;
  readonly grantId: string | null;
}

export interface ScheduleCheck {
  readonly workspaceId: string;
  readonly post: LockedPost;
  readonly scheduler: Scheduler;
  readonly approvalRequestId: string | null;
  readonly account: {
    readonly id: string;
    readonly brandId: string | null;
    readonly locationId: string | null;
  };
  readonly now: Temporal.Instant;
}

const DENIED: Decision = { kind: 'deny', code: 'not_permitted' };

export async function schedulerPrincipal(
  trx: TenantDb,
  workspaceId: string,
  scheduler: Scheduler,
  now: Temporal.Instant,
): Promise<Bound<Principal> | null> {
  if (scheduler.userId !== null) {
    return await bindUserIn(trx, workspaceId, scheduler.userId, now);
  }
  if (scheduler.grantId === null) return null;
  const grant = await trx
    .selectFrom('access_grants')
    .select(['scopes', 'sponsor_user_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', scheduler.grantId)
    .where('revoked_at', 'is', null)
    .where((eb) => eb.or([eb('expires_at', 'is', null), eb('expires_at', '>', sql<Date>`now()`)]))
    .executeTakeFirst();
  if (grant === undefined) return null;
  return await bindGrantIn(trx, {
    workspaceId,
    grantId: scheduler.grantId,
    scopes: grant.scopes,
    sponsorUserId: grant.sponsor_user_id,
  });
}

export async function approvalStatus(
  trx: TenantDb,
  workspaceId: string,
  post: LockedPost,
  approvalRequestId: string | null,
): Promise<ApprovalStatus> {
  if (approvalRequestId !== null) {
    const request = await trx
      .selectFrom('approval_requests')
      .select('state')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', approvalRequestId)
      .executeTakeFirst();
    if (request?.state === 'approved') return 'approved';
  }
  const policy = await effectivePolicy(trx, workspaceId, post.brand_id);
  return policy.mode === 'none' ? 'exempt' : 'missing';
}

export async function authorizeScheduler(trx: TenantDb, check: ScheduleCheck): Promise<Decision> {
  const bound = await schedulerPrincipal(trx, check.workspaceId, check.scheduler, check.now);
  if (bound === null) return DENIED;
  const approval = await approvalStatus(
    trx,
    check.workspaceId,
    check.post,
    check.approvalRequestId,
  );
  return authorize(
    bound.principal,
    'posts:schedule',
    {
      workspaceId: check.workspaceId,
      postId: check.post.id,
      units: [
        {
          ...(check.account.brandId === null ? {} : { brandId: check.account.brandId }),
          ...(check.account.locationId === null ? {} : { locationId: check.account.locationId }),
          socialAccountId: check.account.id,
        },
      ],
    },
    {
      now: check.now,
      approval,
      ...(bound.accessScope === undefined ? {} : { accessScope: bound.accessScope }),
    },
  );
}
