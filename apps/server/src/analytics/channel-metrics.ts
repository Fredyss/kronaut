import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { invalid, zodDetails } from '../posts/list.ts';
import { pathId } from '../posts/params.ts';
import { scopeUnit } from '../posts/units.ts';
import { requireChannel } from '../queue/routes.ts';
import { storedValue } from './store.ts';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;

export const ChannelMetricsSchema = z.object({
  followers: z.array(
    z.object({ day: z.iso.date(), value: z.number().int().nonnegative().nullable() }),
  ),
});

export const channelMetricsRoute = defineRoute({
  id: 'analytics.channel_metrics',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/channels/:channelId/metrics',
  auth: ['session', 'grant'],
  action: 'analytics:read',
  params: z.object({ workspaceId: z.string(), channelId: z.string() }),
  query: z.object({ from: z.string().optional(), to: z.string().optional() }),
  response: ChannelMetricsSchema,
  summary: "Read a channel's metrics",
  description: `The daily follower counts in [from, to] (UTC dates; default the last ${DEFAULT_DAYS} days up to today; at most ${MAX_DAYS} days). A day is listed only when the count changed; a null value means the network did not report it.`,
  tags: ['analytics'],
});

const Range = z.strictObject({ from: z.iso.date().optional(), to: z.iso.date().optional() });

interface DayRange {
  readonly from: string;
  readonly to: string;
}

export function dayRange(
  query: z.output<typeof channelMetricsRoute.query>,
  now: Temporal.Instant,
): DayRange {
  const present = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined));
  const parsed = Range.safeParse(present);
  if (!parsed.success) throw invalid(zodDetails(parsed.error));
  const to =
    parsed.data.to === undefined
      ? now.toZonedDateTimeISO('UTC').toPlainDate()
      : Temporal.PlainDate.from(parsed.data.to);
  const from =
    parsed.data.from === undefined
      ? to.subtract({ days: DEFAULT_DAYS })
      : Temporal.PlainDate.from(parsed.data.from);
  const days = from.until(to, { largestUnit: 'day' }).days + 1;
  if (days < 1) throw invalid([{ path: 'query.to', code: 'range_invalid' }]);
  if (days > MAX_DAYS) throw invalid([{ path: 'query.to', code: 'range_too_large' }]);
  return { from: from.toString(), to: to.toString() };
}

async function readFollowers(
  trx: TenantDb,
  ref: { readonly workspaceId: string; readonly accountId: string },
  range: DayRange,
) {
  const rows = await trx
    .selectFrom('account_daily_metrics')
    .select(['day', 'value'])
    .where('workspace_id', '=', ref.workspaceId)
    .where('social_account_id', '=', ref.accountId)
    .where('metric', '=', 'followers')
    .where('day', '>=', range.from)
    .where('day', '<=', range.to)
    .orderBy('day')
    .execute();
  return { followers: rows.map((row) => ({ day: row.day, value: storedValue(row.value) })) };
}

export function bindChannelMetrics(): BoundRoute {
  return bindRoute(channelMetricsRoute, async ({ params, query }, ctx) => {
    const ref = {
      workspaceId: pathId('workspace', params.workspaceId),
      accountId: pathId('socialAccount', params.channelId),
    };
    const range = dayRange(query, ctx.now);
    const body = await ctx.tenant(async (trx) => {
      const account = await requireChannel(trx, ref);
      const unit = scopeUnit(account.id, account.brand_id, account.location_id);
      ctx.authorize('analytics:read', { workspaceId: ref.workspaceId, units: [unit] });
      return await readFollowers(trx, ref, range);
    });
    return { body };
  });
}
