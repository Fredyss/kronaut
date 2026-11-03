import { decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { databaseError, HttpError, type IssueDetail } from '../../base/http/errors.ts';
import { lockQueues } from '../../steps/queue/slots.ts';
import { type ImportEnv, importRow, type RowDone } from './import-row.ts';
import type { ImportBody, ImportCheckOutput, ImportOutput, ImportRowBody } from './input.ts';

const SCHEDULE_FIELDS: ReadonlySet<string> = new Set(['mode', 'scheduleLocal', 'scheduleTz']);

type RowResult = { readonly done: RowDone } | { readonly details: readonly IssueDetail[] };

function rowPath(index: number, path: string): string {
  const row = `body.rows.${index}`;
  if (!path.startsWith('body.')) return `${row}.${path}`;
  const rest = path.slice('body.'.length);
  const field = rest.split('.')[0] ?? '';
  return SCHEDULE_FIELDS.has(field) ? `${row}.schedule.${rest}` : `${row}.${rest}`;
}

function rowDetails(index: number, err: HttpError): IssueDetail[] {
  if (err.details === undefined || err.details.length === 0) {
    return [{ path: `body.rows.${index}`, code: err.code }];
  }
  return err.details.map((detail) => ({ path: rowPath(index, detail.path), code: detail.code }));
}

async function guardedRow(
  trx: TenantDb,
  env: ImportEnv,
  row: ImportRowBody,
  index: number,
): Promise<RowResult> {
  const point = sql.raw(`import_row_${index}`);
  await sql`savepoint ${point}`.execute(trx);
  try {
    const done = await importRow(trx, env, row, index);
    await sql`release savepoint ${point}`.execute(trx);
    return { done };
  } catch (err) {
    const mapped = err instanceof HttpError ? err : databaseError(err);
    if (!(mapped instanceof HttpError)) throw err;
    await sql`rollback to savepoint ${point}`.execute(trx);
    await sql`release savepoint ${point}`.execute(trx);
    return { details: rowDetails(index, mapped) };
  }
}

function queueChannels(rows: readonly ImportRowBody[]): string[] {
  return rows
    .filter((row) => row.schedule.mode === 'queue')
    .flatMap((row) => row.destinations.map((d) => decodePublicId('socialAccount', d.accountId)))
    .filter((id) => id !== null);
}

// Every queue channel is locked once, in id order, before row 0: rows lock in CSV order, which
// would deadlock against a composer or another import that takes the same channels in id order.
async function runRows(trx: TenantDb, env: ImportEnv, body: ImportBody): Promise<RowDone[]> {
  await lockQueues(trx, queueChannels(body.rows));
  const done: RowDone[] = [];
  const details: IssueDetail[] = [];
  for (const [index, row] of body.rows.entries()) {
    const result = await guardedRow(trx, env, row, index);
    if ('done' in result) done.push(result.done);
    else details.push(...result.details);
  }
  if (details.length > 0) {
    throw new HttpError('unprocessable', 'Some rows could not be imported.', { details });
  }
  return done;
}

export async function importPosts(
  trx: TenantDb,
  env: ImportEnv,
  body: ImportBody,
): Promise<ImportOutput> {
  const done = await runRows(trx, env, body);
  return {
    rows: done.map(({ outcome, postId }) => ({ outcome, postId: encodePublicId('post', postId) })),
  };
}

export async function checkImport(
  trx: TenantDb,
  env: ImportEnv,
  body: ImportBody,
): Promise<ImportCheckOutput> {
  await sql`savepoint import_check`.execute(trx);
  const done = await runRows(trx, env, body);
  await sql`rollback to savepoint import_check`.execute(trx);
  return { rows: done.map(({ outcome }) => ({ outcome })) };
}
