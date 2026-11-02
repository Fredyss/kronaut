import { randomUUID } from 'node:crypto';
import {
  occurrenceAt,
  parseRule,
  type Resource,
  type RuleSeries,
  resolveLocal,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { auditActor } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import type { ownerColumns } from '../posts/owner.ts';
import { postUnits } from '../posts/units.ts';

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

export async function findSeries(
  trx: TenantDb,
  workspaceId: string,
  seriesId: string,
  lock: boolean,
) {
  const row = await seriesRows(trx, workspaceId)
    .where('id', '=', seriesId)
    .$if(lock, (qb) => qb.forUpdate())
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Not found.');
  const latest = await latestOccurrence(trx, workspaceId, seriesId);
  if (latest === undefined) return { row, resource: { workspaceId } };
  const post = await trx
    .selectFrom('posts')
    .select(['id', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', latest.id)
    .executeTakeFirstOrThrow();
  const units = await postUnits(trx, workspaceId, post);
  const resource: Resource = { workspaceId, postId: post.id, units };
  return { row, resource };
}

type Owner = ReturnType<typeof ownerColumns>;

type SeriesChange =
  | { readonly state: 'stopped' }
  | { readonly state: 'active'; readonly owner: Owner };

export interface SeriesTarget {
  readonly workspaceId: string;
  readonly row: SeriesRow;
}

export async function changeSeries(
  trx: TenantDb,
  ctx: RequestContext,
  { workspaceId, row }: SeriesTarget,
  to: SeriesChange,
) {
  const owner =
    to.state === 'active' ? { owner_user_id: null, owner_grant_id: null, ...to.owner } : {};
  const changed = await trx
    .updateTable('post_series')
    .set({ state: to.state, state_reason: null, ...owner, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', row.id)
    .returning(['state', 'state_reason', 'owner_user_id', 'owner_grant_id'])
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      ...(await auditActor(trx, workspaceId, ctx.principal)),
      action: to.state === 'active' ? 'series.resumed' : 'series.stopped',
      resource_kind: 'post_series',
      resource_id: row.id,
      outcome: 'ok',
      args_summary: JSON.stringify({ occurrences: row.occurrences }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
  return { ...row, ...changed };
}
