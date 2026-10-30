import { formatRule, type Resource, RuleError, resolveLocal } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import { unprocessable } from '../http/issues.ts';
import type { RequestContext } from '../http/types.ts';
import { ownerColumns } from '../posts/owner.ts';
import { type RepeatBody, ruleOf } from './repeat.ts';

export interface SeriesStart {
  readonly resource: Resource & { readonly postId: string };
  readonly body: { readonly scheduleLocal: string; readonly scheduleTz: string };
  readonly repeat: RepeatBody;
}

const INVALID = [{ path: 'body.repeat', code: 'invalid_repeat' }];
const NEEDS_SCHEDULE = [{ path: 'body.repeat', code: 'repeat_needs_schedule' }];

type SeriesActor = Pick<RequestContext, 'principal' | 'authorize'>;

function ruleText(repeat: RepeatBody, start: Temporal.PlainDateTime): string {
  if (repeat.until !== undefined && repeat.until < start.toPlainDate().toString()) {
    throw unprocessable(INVALID);
  }
  try {
    return formatRule(ruleOf(repeat));
  } catch (err) {
    if (err instanceof RuleError) throw unprocessable(INVALID);
    throw err;
  }
}

// The job schedules each occurrence as the owner, so an owner who may only submit would stall it.
function authorizeRepeat(ctx: SeriesActor, resource: Resource): void {
  try {
    ctx.authorize('posts:schedule', resource, { approval: 'approved' });
  } catch (err) {
    if (!(err instanceof HttpError) || err.code !== 'forbidden') throw err;
    throw new HttpError('forbidden', 'Repeating a post needs permission to schedule it.', {
      details: NEEDS_SCHEDULE,
    });
  }
}

export async function startSeries(
  trx: TenantDb,
  ctx: SeriesActor,
  { resource, body, repeat }: SeriesStart,
): Promise<string> {
  authorizeRepeat(ctx, resource);
  const { workspaceId, postId } = resource;
  const start = Temporal.PlainDateTime.from(body.scheduleLocal);
  const rrule = ruleText(repeat, start);
  const post = await trx
    .selectFrom('posts')
    .select('series_id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .executeTakeFirstOrThrow();
  if (post.series_id !== null) {
    throw new HttpError('conflict', 'The post already belongs to a series.');
  }
  const { id } = await trx
    .insertInto('post_series')
    .values({
      workspace_id: workspaceId,
      rrule,
      dtstart_local: start.toString(),
      timezone: resolveLocal(start, body.scheduleTz).tz,
      ...ownerColumns(ctx.principal),
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await trx
    .updateTable('posts')
    .set({ series_id: id })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .execute();
  return id;
}
