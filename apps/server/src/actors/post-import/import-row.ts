import type { ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { type CurrentPost, lockCurrent, lockDestinations } from '../../access/post-access/locks.ts';
import { postUnits } from '../../access/post-access/units.ts';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { authorOf, insertDraft } from '../../flow/posts/draft/create.ts';
import { openApprovalRequest } from '../../flow/posts/schedule/approval-request.ts';
import { authorizeSchedule, scheduleLocked } from '../../flow/posts/schedule/schedule.ts';
import type { ImportRowBody, RowOutcome, RowSchedule } from './input.ts';

export interface ImportEnv {
  readonly ctx: Pick<RequestContext, 'principal' | 'now' | 'authorize'>;
  readonly providers: ProviderRegistry;
  readonly workspaceId: string;
}

export interface RowDone {
  readonly outcome: RowOutcome;
  readonly postId: string;
}

interface RowTurn {
  readonly env: ImportEnv;
  readonly locked: CurrentPost;
  readonly units: readonly ScopeUnit[];
}

async function scheduleRow(trx: TenantDb, turn: RowTurn, schedule: RowSchedule) {
  const { env, locked, units } = turn;
  const { ctx, providers, workspaceId } = env;
  const auth = await authorizeSchedule(trx, ctx, { workspaceId, locked, units });
  const rows = await lockDestinations(trx, workspaceId, locked.id);
  const body = { ...schedule, expectedVersion: locked.version };
  await scheduleLocked(trx, { providers, now: ctx.now, workspaceId, locked, auth, body }, rows);
}

async function requestRow(trx: TenantDb, turn: RowTurn, schedule: RowSchedule) {
  const { env, locked, units } = turn;
  const { ctx, providers, workspaceId } = env;
  ctx.authorize('posts:submit', { workspaceId, postId: locked.id, units });
  await openApprovalRequest(trx, ctx, {
    providers,
    workspaceId,
    locked,
    schedule:
      schedule.mode === 'instant'
        ? { scheduleLocal: schedule.scheduleLocal, scheduleTz: schedule.scheduleTz }
        : undefined,
    note: undefined,
  });
}

export async function importRow(
  trx: TenantDb,
  env: ImportEnv,
  row: ImportRowBody,
  index: number,
): Promise<RowDone> {
  const { ctx, providers, workspaceId } = env;
  const postId = await insertDraft(trx, providers, {
    workspaceId,
    body: { items: row.items, destinations: row.destinations },
    columns: { schedule_mode: 'unscheduled', ...authorOf(ctx.principal), origin: 'import' },
    authorize: (units) => ctx.authorize('posts:draft', { workspaceId, units }),
  });
  const locked = await lockCurrent(trx, workspaceId, postId);
  const turn = { env, locked, units: await postUnits(trx, workspaceId, locked) };
  const point = sql.raw(`import_schedule_${index}`);
  await sql`savepoint ${point}`.execute(trx);
  try {
    await scheduleRow(trx, turn, row.schedule);
    await sql`release savepoint ${point}`.execute(trx);
    return { outcome: 'scheduled', postId };
  } catch (err) {
    if (!(err instanceof HttpError) || err.code !== 'approval_required') throw err;
    await sql`rollback to savepoint ${point}`.execute(trx);
    await requestRow(trx, turn, row.schedule);
    return { outcome: 'requested', postId };
  }
}
