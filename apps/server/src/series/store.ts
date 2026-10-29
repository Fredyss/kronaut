import { occurrenceAt, parseRule, type RuleSeries } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import { resolveLocal } from '../posts/freeze.ts';

const SERIES_COLUMNS = [
  'id',
  'rrule',
  'dtstart_local',
  'timezone',
  'owner_user_id',
  'owner_grant_id',
  'state',
  'state_reason',
  'occurrences',
] as const;

export function seriesRows(trx: TenantDb, workspaceId: string) {
  return trx
    .selectFrom('post_series')
    .select(SERIES_COLUMNS)
    .where('workspace_id', '=', workspaceId);
}

export type SeriesRow = Awaited<ReturnType<ReturnType<typeof seriesRows>['execute']>>[number];

export function plainOf(value: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(value.replace(' ', 'T'));
}

export function ruleSeriesOf(row: SeriesRow): RuleSeries {
  return { rule: parseRule(row.rrule), dtstart: plainOf(row.dtstart_local) };
}

export async function latestOccurrence(trx: TenantDb, workspaceId: string, seriesId: string) {
  return await trx
    .selectFrom('posts')
    .select(['id', 'schedule_local', 'schedule_tz', 'publish_summary', 'agent_dirty'])
    .where('workspace_id', '=', workspaceId)
    .where('series_id', '=', seriesId)
    .where('deleted_at', 'is', null)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
}

export type Occurrence = NonNullable<Awaited<ReturnType<typeof latestOccurrence>>>;

export function intendedTime(post: Occurrence) {
  if (post.schedule_local === null || post.schedule_tz === null) return null;
  return resolveLocal(plainOf(post.schedule_local), post.schedule_tz);
}

// The earliest destination time once scheduled; the post's wall time while it is a draft; and the
// rule's own instant when a person has cleared both.
export async function occurrenceInstant(
  trx: TenantDb,
  workspaceId: string,
  row: SeriesRow,
  post: Occurrence,
): Promise<Temporal.Instant | null> {
  const { first } = await trx
    .selectFrom('post_destinations')
    .select((eb) => eb.fn.min('scheduled_at').as('first'))
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', post.id)
    .executeTakeFirstOrThrow();
  if (first !== null) return Temporal.Instant.fromEpochMilliseconds(new Date(first).getTime());
  const intended = intendedTime(post);
  if (intended !== null) return intended.at;
  const local = occurrenceAt(ruleSeriesOf(row), row.occurrences);
  return local === null ? null : resolveLocal(local, row.timezone).at;
}
