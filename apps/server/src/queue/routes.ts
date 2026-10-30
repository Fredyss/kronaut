import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { type ChannelRef, requireChannel } from '../channels/channel-ref.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { unprocessable } from '../posts/issues.ts';
import { pathId } from '../posts/params.ts';
import { InstantFields } from '../posts/schedule.ts';
import { scopeUnit } from '../posts/units.ts';
import { freeSlots, lockQueues, type QueueSlot } from './slots.ts';

const PATH = '/v1/workspaces/:workspaceId/channels/:channelId/queue';
const MAX_SLOTS = 56;
const UPCOMING = 3;

const QueueParams = z.object({ workspaceId: z.string(), channelId: z.string() });

const SlotSchema = z.strictObject({
  weekday: z.number().int().min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const QueueSchema = z.object({
  timezone: z.string().nullable(),
  slots: z.array(SlotSchema),
  upcoming: z.array(
    z.object({
      at: z.iso.datetime(),
      local: z.iso.datetime({ local: true, precision: -1 }),
      timezone: z.string(),
    }),
  ),
});

export const channelQueueRoute = defineRoute({
  id: 'channels.queue',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'channels:read',
  params: QueueParams,
  response: QueueSchema,
  summary: "Read a channel's queue",
  description:
    'The weekly slots (weekday 1 = Monday, local time in the queue time zone) and the next free slots that "add to queue" would take. A channel without slots has a null time zone.',
  tags: ['channels'],
});

export const channelQueueUpdateRoute = defineRoute({
  id: 'channels.queue_update',
  method: 'PUT',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: QueueParams,
  body: z.strictObject({ timezone: InstantFields.scheduleTz, slots: z.array(SlotSchema) }),
  response: QueueSchema,
  idempotency: true,
  summary: "Replace a channel's queue",
  description: `Replaces every slot of the channel's queue; at most ${MAX_SLOTS} slots, each weekday and time once. An empty list clears the queue and ignores the time zone. Scheduled posts never move. Owners and admins only.`,
  tags: ['channels'],
});

function channelRef(params: z.output<typeof QueueParams>): ChannelRef {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    accountId: pathId('socialAccount', params.channelId),
  };
}

function slotKey(slot: QueueSlot): string {
  return `${slot.weekday}T${slot.time.toString({ smallestUnit: 'minute' })}`;
}

async function readQueue(trx: TenantDb, ref: ChannelRef, now: Temporal.Instant) {
  const { timetable, free } = await freeSlots(trx, { ...ref, now, postId: null }, UPCOMING);
  return {
    timezone: timetable.timezone,
    slots: timetable.slots.map((slot) => ({
      weekday: slot.weekday,
      time: slot.time.toString({ smallestUnit: 'minute' }),
    })),
    upcoming: free.map((s) => ({
      at: new Date(s.at.epochMilliseconds).toISOString(),
      local: s.local.toString({ smallestUnit: 'minute' }),
      timezone: s.tz,
    })),
  };
}

type QueueBody = z.output<typeof channelQueueUpdateRoute.body>;

function canonicalZone(timezone: string): string {
  try {
    return Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(timezone).timeZoneId;
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
    throw unprocessable([{ path: 'body.timezone', code: 'invalid_time_zone' }]);
  }
}

function parseSlots(body: QueueBody): QueueSlot[] {
  if (body.slots.length > MAX_SLOTS) {
    throw unprocessable([{ path: 'body.slots', code: 'too_many_slots' }]);
  }
  const slots = body.slots.map((s) => ({
    weekday: s.weekday,
    time: Temporal.PlainTime.from(s.time),
  }));
  if (new Set(slots.map(slotKey)).size !== slots.length) {
    throw unprocessable([{ path: 'body.slots', code: 'duplicate_slot' }]);
  }
  return slots;
}

async function replaceQueue(trx: TenantDb, ctx: RequestContext, ref: ChannelRef, body: QueueBody) {
  const slots = parseSlots(body);
  const timezone = slots.length === 0 ? null : canonicalZone(body.timezone);
  await lockQueues(trx, [ref.accountId]);
  await trx
    .deleteFrom('queue_slots')
    .where('workspace_id', '=', ref.workspaceId)
    .where('social_account_id', '=', ref.accountId)
    .execute();
  if (timezone !== null) {
    await trx
      .insertInto('queue_slots')
      .values(
        slots.map((slot) => ({
          workspace_id: ref.workspaceId,
          social_account_id: ref.accountId,
          weekday: slot.weekday,
          local_time: slot.time.toString({ smallestUnit: 'minute' }),
          timezone,
        })),
      )
      .execute();
  }
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action: 'channel.queue_updated',
      resource_kind: 'social_account',
      resource_id: ref.accountId,
      social_account_ids: [ref.accountId],
      outcome: 'ok',
      args_summary: JSON.stringify({ timezone, slots: slots.length }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

export function queueRoutes(): BoundRoute[] {
  return [
    bindRoute(channelQueueRoute, async ({ params }, ctx) => {
      const ref = channelRef(params);
      const body = await ctx.tenant(async (trx) => {
        const account = await requireChannel(trx, ref);
        const unit = scopeUnit(account.id, account.brand_id, account.location_id);
        ctx.authorize('channels:read', { workspaceId: ref.workspaceId, units: [unit] });
        return await readQueue(trx, ref, ctx.now);
      });
      return { body };
    }),
    bindRoute(channelQueueUpdateRoute, async ({ params, body }, ctx) => {
      const ref = channelRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      const queue = await ctx.tenant(async (trx) => {
        await requireChannel(trx, ref);
        await replaceQueue(trx, ctx, ref, body);
        return await readQueue(trx, ref, ctx.now);
      });
      return { body: queue };
    }),
  ];
}
