import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import type { Schedule } from '../posts/freeze.ts';

export const REUSE_DAYS = 30;
const IN_FLIGHT = ['scheduled', 'publishing', 'retry_wait', 'verifying', 'awaiting_manual'];

export interface ChannelScope {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly now: Temporal.Instant;
}

function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

export async function poolChannels(trx: TenantDb, workspaceId: string): Promise<string[]> {
  const rows = await trx
    .selectFrom('evergreen_posts as e')
    .innerJoin('posts as p', (join) =>
      join.onRef('p.workspace_id', '=', 'e.workspace_id').onRef('p.id', '=', 'e.post_id'),
    )
    .innerJoin('post_destinations as d', (join) =>
      join.onRef('d.workspace_id', '=', 'e.workspace_id').onRef('d.post_id', '=', 'e.post_id'),
    )
    .select('d.social_account_id')
    .distinct()
    .where('e.workspace_id', '=', workspaceId)
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .where('e.state', '=', 'active')
    .where('p.deleted_at', 'is', null)
    .where('d.state', '<>', 'canceled')
    .where('a.status', '=', 'active')
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('queue_slots as q')
          .select(sql`1`.as('one'))
          .whereRef('q.workspace_id', '=', 'd.workspace_id')
          .whereRef('q.social_account_id', '=', 'd.social_account_id'),
      ),
    )
    .orderBy('d.social_account_id')
    .execute();
  return rows.map((row) => row.social_account_id);
}

export async function claimedSlots(
  trx: TenantDb,
  scope: ChannelScope,
  free: readonly Schedule[],
): Promise<ReadonlySet<number>> {
  const first = free[0];
  const last = free.at(-1);
  if (first === undefined || last === undefined) return new Set();
  const rows = await trx
    .selectFrom('evergreen_runs')
    .select('slot_at')
    .where('workspace_id', '=', scope.workspaceId)
    .where('social_account_id', '=', scope.accountId)
    .where('slot_at', '>=', toDate(first.at))
    .where('slot_at', '<=', toDate(last.at))
    .execute();
  return new Set(rows.map((row) => row.slot_at.getTime()));
}

function lastUsed(accountId: string) {
  return sql<Date | null>`(
    select max(r.slot_at) from evergreen_runs r
     where r.workspace_id = e.workspace_id and r.evergreen_post_id = e.post_id
       and r.social_account_id = ${accountId})`;
}

function usedSince(accountId: string, since: Date) {
  return sql<boolean>`exists (
    select 1 from evergreen_runs r
     where r.workspace_id = e.workspace_id and r.evergreen_post_id = e.post_id
       and r.social_account_id = ${accountId} and r.slot_at > ${since})`;
}

function pendingCopy(accountId: string, now: Date) {
  return sql<boolean>`exists (
    select 1 from evergreen_runs r
     where r.workspace_id = e.workspace_id and r.evergreen_post_id = e.post_id
       and r.social_account_id = ${accountId}
       and (r.slot_at > ${now} or exists (
         select 1 from posts c
           join post_destinations cd on cd.workspace_id = c.workspace_id and cd.post_id = c.id
          where c.workspace_id = r.workspace_id and c.id = r.copy_post_id and c.deleted_at is null
            and cd.social_account_id = ${accountId} and cd.state = any(${IN_FLIGHT}))))`;
}

function onChannel(accountId: string) {
  return sql<boolean>`exists (
    select 1 from post_destinations d
     where d.workspace_id = e.workspace_id and d.post_id = e.post_id
       and d.social_account_id = ${accountId} and d.state <> 'canceled')`;
}

// The pool post's own destination counts like a copy: recent or upcoming, and in flight.
function ownRecent(accountId: string, since: Date) {
  return sql<boolean>`exists (
    select 1 from post_destinations d
     where d.workspace_id = e.workspace_id and d.post_id = e.post_id
       and d.social_account_id = ${accountId}
       and (d.state = any(${IN_FLIGHT}) or (d.state <> 'canceled'
            and (d.scheduled_at > ${since} or d.published_at > ${since}))))`;
}

export function eligiblePool(trx: TenantDb, scope: ChannelScope, limit: number) {
  const { accountId } = scope;
  const since = toDate(scope.now.subtract({ hours: REUSE_DAYS * 24 }));
  return trx
    .selectFrom('evergreen_posts as e')
    .innerJoin('posts as p', (join) =>
      join.onRef('p.workspace_id', '=', 'e.workspace_id').onRef('p.id', '=', 'e.post_id'),
    )
    .select(['e.post_id', 'e.owner_user_id', 'e.owner_grant_id'])
    .select(lastUsed(accountId).as('last_used'))
    .where('e.workspace_id', '=', scope.workspaceId)
    .where('e.state', '=', 'active')
    .where('p.deleted_at', 'is', null)
    .where(onChannel(accountId))
    .where(sql<boolean>`not ${usedSince(accountId, since)}`)
    .where(sql<boolean>`not ${ownRecent(accountId, since)}`)
    .where(sql<boolean>`not ${pendingCopy(accountId, toDate(scope.now))}`)
    .orderBy(sql`last_used nulls first`)
    .orderBy('p.created_at')
    .orderBy('p.id')
    .limit(limit)
    .forUpdate('e')
    .skipLocked()
    .execute();
}

export type PoolRow = Awaited<ReturnType<typeof eligiblePool>>[number];

export function untilOf(now: Temporal.Instant): Temporal.Instant {
  return now.add(Temporal.Duration.from({ hours: 24 }));
}
