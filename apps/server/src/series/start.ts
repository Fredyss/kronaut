import { formatRule, type Principal, RuleError } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import { resolveLocal } from '../posts/freeze.ts';
import { unprocessable } from '../posts/issues.ts';
import { type RepeatBody, ruleOf } from './repeat.ts';

export interface SeriesStart {
  readonly workspaceId: string;
  readonly postId: string;
  readonly body: { readonly scheduleLocal: string; readonly scheduleTz: string };
  readonly repeat: RepeatBody;
}

const INVALID = [{ path: 'body.repeat', code: 'invalid_repeat' }];

export function seriesOwner(principal: Principal | null) {
  if (principal?.kind === 'user') return { owner_user_id: principal.userId };
  if (principal?.kind === 'grant') return { owner_grant_id: principal.grantId };
  throw new HttpError('internal', 'No user or API key is bound to this request.');
}

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

export async function startSeries(
  trx: TenantDb,
  ctx: { readonly principal: Principal | null },
  { workspaceId, postId, body, repeat }: SeriesStart,
): Promise<string> {
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
      ...seriesOwner(ctx.principal),
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
