import { defineRoute } from '@kronaut/contract';
import { encodePublicId, nextOccurrence, occurrenceAt } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { ownerColumns } from '../posts/owner.ts';
import { RepeatInput, repeatOf } from './repeat.ts';
import {
  changeSeries,
  findSeries,
  latestOccurrence,
  occurrenceInstant,
  plainOf,
  ruleSeriesOf,
  type SeriesRow,
  type SeriesTarget,
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
  stateReason: z
    .enum(['owner_lost', 'advance_failed', 'count_reached', 'until_passed', 'occurrences_deleted'])
    .nullable(),
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

export const seriesResumeRoute = defineRoute({
  id: 'series.resume',
  method: 'POST',
  path: `${PATH}/resume`,
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: SeriesParams,
  response: SeriesSchema,
  idempotency: true,
  summary: 'Resume a paused recurring series',
  description:
    'Sets a paused series active again, with the caller as its new owner: later occurrences are scheduled or submitted in their name. An active series is returned unchanged; an ended or stopped one is a conflict.',
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

async function stop(trx: TenantDb, ctx: RequestContext, target: SeriesTarget) {
  const { row } = target;
  if (row.state === 'stopped' || row.state === 'ended') return row;
  return await changeSeries(trx, ctx, target, { state: 'stopped' });
}

async function resume(trx: TenantDb, ctx: RequestContext, target: SeriesTarget) {
  const { row } = target;
  if (row.state === 'active') return row;
  if (row.state !== 'paused') throw new HttpError('conflict', 'Only a paused series can resume.');
  return await changeSeries(trx, ctx, target, {
    state: 'active',
    owner: ownerColumns(ctx.principal),
  });
}

type Transition = (trx: TenantDb, ctx: RequestContext, target: SeriesTarget) => Promise<SeriesRow>;

async function transition(
  ctx: RequestContext,
  params: z.infer<typeof SeriesParams>,
  apply: Transition,
) {
  const workspaceId = pathId('workspace', params.workspaceId);
  const seriesId = pathId('series', params.seriesId);
  return await ctx.tenant(async (trx) => {
    const { row, resource } = await findSeries(trx, workspaceId, seriesId, true);
    ctx.authorize('posts:schedule', resource, { approval: 'approved' });
    return await seriesDto(trx, workspaceId, await apply(trx, ctx, { workspaceId, row }), ctx.now);
  });
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
      return { body: await transition(ctx, params, stop) };
    }),
    bindRoute(seriesResumeRoute, async ({ params }, ctx) => {
      return { body: await transition(ctx, params, resume) };
    }),
  ];
}
