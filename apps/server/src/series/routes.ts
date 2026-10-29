import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { encodePublicId, nextOccurrence, occurrenceAt, type Resource } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { pathId } from '../posts/params.ts';
import { postUnits } from '../posts/units.ts';
import { RepeatInput, repeatOf } from './repeat.ts';
import {
  latestOccurrence,
  occurrenceInstant,
  plainOf,
  ruleSeriesOf,
  type SeriesRow,
  seriesRows,
} from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/series/:seriesId';
const LocalTime = z.iso.datetime({ local: true });

const SeriesParams = z.object({ workspaceId: z.string(), seriesId: z.string() });

export const SeriesSchema = z.object({
  id: z.string(),
  rule: RepeatInput,
  timezone: z.string(),
  dtstartLocal: LocalTime,
  state: z.enum(['active', 'paused', 'ended', 'stopped']),
  stateReason: z.enum(['owner_lost', 'count_reached', 'until_passed']).nullable(),
  occurrences: z.number().int().positive(),
  nextLocal: LocalTime.nullable(),
});

export const seriesGetRoute = defineRoute({
  id: 'series.get',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: SeriesParams,
  response: SeriesSchema,
  summary: 'Get a recurring series',
  description:
    'The repeat rule, its start in local wall time, the state and the local time of the next occurrence (null once the series has ended or stopped).',
  tags: ['posts'],
});

export const seriesStopRoute = defineRoute({
  id: 'series.stop',
  method: 'POST',
  path: `${PATH}/stop`,
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: SeriesParams,
  response: SeriesSchema,
  idempotency: true,
  summary: 'Stop a recurring series',
  description:
    'Ends the series: no further occurrence is created. Occurrences that already exist stay as they are.',
  tags: ['posts'],
});

async function nextLocal(
  trx: TenantDb,
  workspaceId: string,
  row: SeriesRow,
  now: Temporal.Instant,
) {
  if (row.state === 'ended' || row.state === 'stopped') return null;
  const latest = await latestOccurrence(trx, workspaceId, row.id);
  const at = latest === undefined ? null : await occurrenceInstant(trx, workspaceId, row, latest);
  const series = ruleSeriesOf(row);
  const current = occurrenceAt(series, row.occurrences);
  if (at !== null && Temporal.Instant.compare(at, now) > 0 && latest !== undefined) {
    if (latest.schedule_local !== null) return plainOf(latest.schedule_local).toString();
    return at.toZonedDateTimeISO(row.timezone).toPlainDateTime().toString();
  }
  if (current === null) return null;
  return nextOccurrence(series, { index: row.occurrences, local: current })?.toString() ?? null;
}

async function seriesDto(
  trx: TenantDb,
  workspaceId: string,
  row: SeriesRow,
  now: Temporal.Instant,
) {
  return SeriesSchema.parse({
    id: encodePublicId('series', row.id),
    rule: repeatOf(ruleSeriesOf(row).rule),
    timezone: row.timezone,
    dtstartLocal: plainOf(row.dtstart_local).toString(),
    state: row.state,
    stateReason: row.state_reason,
    occurrences: row.occurrences,
    nextLocal: await nextLocal(trx, workspaceId, row, now),
  });
}

async function findSeries(trx: TenantDb, workspaceId: string, seriesId: string, lock: boolean) {
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

async function stop(trx: TenantDb, ctx: RequestContext, workspaceId: string, row: SeriesRow) {
  if (row.state === 'stopped' || row.state === 'ended') return row;
  const stopped = await trx
    .updateTable('post_series')
    .set({ state: 'stopped', state_reason: null, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', row.id)
    .returning(['state', 'state_reason'])
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      ...(await auditActor(trx, workspaceId, ctx.principal)),
      action: 'series.stopped',
      resource_kind: 'post_series',
      resource_id: row.id,
      outcome: 'ok',
      args_summary: JSON.stringify({ occurrences: row.occurrences }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
  return { ...row, ...stopped };
}

export function seriesRoutes(): BoundRoute[] {
  return [
    bindRoute(seriesGetRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const seriesId = pathId('series', params.seriesId);
      const body = await ctx.tenant(async (trx) => {
        const { row, resource } = await findSeries(trx, workspaceId, seriesId, false);
        ctx.authorize('posts:read', resource);
        return await seriesDto(trx, workspaceId, row, ctx.now);
      });
      return { body };
    }),
    bindRoute(seriesStopRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const seriesId = pathId('series', params.seriesId);
      const body = await ctx.tenant(async (trx) => {
        const { row, resource } = await findSeries(trx, workspaceId, seriesId, true);
        ctx.authorize('posts:schedule', resource, { approval: 'approved' });
        return await seriesDto(trx, workspaceId, await stop(trx, ctx, workspaceId, row), ctx.now);
      });
      return { body };
    }),
  ];
}
