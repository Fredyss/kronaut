import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError, type IssueDetail } from '../http/errors.ts';
import { type ImportEnv, importRow, type RowDone } from './import-row.ts';
import type { ImportBody, ImportOutput, ImportRowBody } from './input.ts';

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
    if (!(err instanceof HttpError)) throw err;
    await sql`rollback to savepoint ${point}`.execute(trx);
    await sql`release savepoint ${point}`.execute(trx);
    return { details: rowDetails(index, err) };
  }
}

// The dry run rolls back to a savepoint instead of throwing, so the idempotency row in the
// same transaction survives and replays the dry-run answer.
export async function importPosts(
  trx: TenantDb,
  env: ImportEnv,
  body: ImportBody,
): Promise<ImportOutput> {
  await sql`savepoint post_import`.execute(trx);
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
  const dryRun = body.dryRun === true;
  await (dryRun
    ? sql`rollback to savepoint post_import`.execute(trx)
    : sql`release savepoint post_import`.execute(trx));
  return {
    rows: done.map(({ outcome, postId }) => ({
      outcome,
      postId: dryRun ? null : encodePublicId('post', postId),
    })),
  };
}
