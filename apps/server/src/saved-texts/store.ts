import { randomUUID } from 'node:crypto';
import {
  canonicalizeDoc,
  canonicalJson,
  DOC_SCHEMA_V,
  DocError,
  type DocJson,
  toPlainText,
} from '@kronaut/compose';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { auditActor } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';

export const NAME_MAX = 60;
export const TEXT_MAX = 2000;
export const WORKSPACE_MAX = 100;

const DOC_MAX_BYTES = 65536;
const NAME_UNIQUE = 'ux_saved_texts_name';
const COLUMNS = ['id', 'name', 'doc'] as const;

export interface SavedTextRef {
  readonly workspaceId: string;
  readonly savedTextId: string;
}

export interface SavedTextChange {
  readonly name?: string | undefined;
  readonly doc?: Record<string, unknown> | undefined;
}

export function listSavedTexts(trx: TenantDb, workspaceId: string) {
  return trx
    .selectFrom('saved_texts')
    .select(COLUMNS)
    .select((eb) =>
      eb
        .selectFrom('social_accounts as a')
        .select(eb.fn.countAll<string>().as('n'))
        .whereRef('a.workspace_id', '=', 'saved_texts.workspace_id')
        .whereRef('a.saved_text_id', '=', 'saved_texts.id')
        .as('channel_count'),
    )
    .where('workspace_id', '=', workspaceId)
    .orderBy(sql`lower(name)`)
    .orderBy('id')
    .execute();
}

type ListedSavedText = Awaited<ReturnType<typeof listSavedTexts>>[number];
type SavedTextRow = Omit<ListedSavedText, 'channel_count'>;

export function savedTextDto(row: SavedTextRow) {
  return { id: encodePublicId('savedText', row.id), name: row.name, doc: row.doc };
}

export function listedSavedTextDto(row: ListedSavedText) {
  return { ...savedTextDto(row), channelCount: Number(row.channel_count ?? 0) };
}

function savedTextName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw new HttpError('unprocessable', `A saved text's name has 1–${NAME_MAX} characters.`, {
      details: [{ path: 'body.name', code: 'saved_text_name_invalid' }],
    });
  }
  return name;
}

function invalidDoc(): HttpError {
  return new HttpError('unprocessable', `A saved text has 1–${TEXT_MAX} characters.`, {
    details: [{ path: 'body.doc', code: 'saved_text_invalid' }],
  });
}

function canonicalDoc(value: unknown): DocJson {
  try {
    return canonicalizeDoc(value);
  } catch (err) {
    if (err instanceof DocError) throw invalidDoc();
    throw err;
  }
}

async function jsonbBytes(trx: TenantDb, doc: DocJson): Promise<number> {
  const result = await sql<{ n: number }>`
    select octet_length(cast(${JSON.stringify(doc)} as jsonb)::text) as n
  `.execute(trx);
  return result.rows[0]?.n ?? 0;
}

async function savedTextDoc(trx: TenantDb, value: unknown): Promise<DocJson> {
  const doc = canonicalDoc(value);
  const text = toPlainText(doc);
  if (text.trim() === '' || [...text].length > TEXT_MAX) throw invalidDoc();
  if ((await jsonbBytes(trx, doc)) > DOC_MAX_BYTES) throw invalidDoc();
  return doc;
}

function isDuplicateName(err: unknown): boolean {
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  return code === '23505' && constraint === NAME_UNIQUE;
}

async function uniquely<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (!isDuplicateName(err)) throw err;
    throw new HttpError('saved_text_exists', 'A saved text with this name already exists.');
  }
}

async function readSavedText(trx: TenantDb, { workspaceId, savedTextId }: SavedTextRef) {
  const row = await trx
    .selectFrom('saved_texts')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', savedTextId)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Saved text not found.');
  return row;
}

interface SavedTextAudit {
  readonly ref: SavedTextRef;
  readonly action: string;
  readonly args?: Readonly<Record<string, boolean>>;
}

async function audit(trx: TenantDb, ctx: RequestContext, { ref, action, args }: SavedTextAudit) {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action,
      resource_kind: 'saved_text',
      resource_id: ref.savedTextId,
      outcome: 'ok',
      args_summary: JSON.stringify(args ?? {}),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

async function checkRoom(trx: TenantDb, workspaceId: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`saved_texts:${workspaceId}`}, 0))`.execute(
    trx,
  );
  const { total } = await trx
    .selectFrom('saved_texts')
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirstOrThrow();
  if (Number(total) >= WORKSPACE_MAX) {
    throw new HttpError(
      'saved_text_limit',
      `A workspace has at most ${WORKSPACE_MAX} saved texts.`,
    );
  }
}

export async function createSavedText(
  trx: TenantDb,
  ctx: RequestContext,
  workspaceId: string,
  body: { readonly name: string; readonly doc: Record<string, unknown> },
) {
  const name = savedTextName(body.name);
  const doc = await savedTextDoc(trx, body.doc);
  await checkRoom(trx, workspaceId);
  const row = await uniquely(() =>
    trx
      .insertInto('saved_texts')
      .values({
        workspace_id: workspaceId,
        name,
        doc: JSON.stringify(doc),
        doc_schema_v: DOC_SCHEMA_V,
      })
      .returning(COLUMNS)
      .executeTakeFirstOrThrow(),
  );
  await audit(trx, ctx, {
    ref: { workspaceId, savedTextId: row.id },
    action: 'saved_text.created',
  });
  return row;
}

export async function updateSavedText(
  trx: TenantDb,
  ctx: RequestContext,
  ref: SavedTextRef,
  body: SavedTextChange,
) {
  const current = await readSavedText(trx, ref);
  const name = body.name === undefined ? current.name : savedTextName(body.name);
  const doc = body.doc === undefined ? current.doc : await savedTextDoc(trx, body.doc);
  const renamed = name !== current.name;
  const edited = canonicalJson(doc) !== canonicalJson(current.doc);
  if (!renamed && !edited) return current;
  const row = await uniquely(() =>
    trx
      .updateTable('saved_texts')
      .set({
        ...(renamed ? { name } : {}),
        ...(edited ? { doc: JSON.stringify(doc), doc_schema_v: DOC_SCHEMA_V } : {}),
        updated_at: sql`now()`,
      })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.savedTextId)
      .returning(COLUMNS)
      .executeTakeFirstOrThrow(),
  );
  await audit(trx, ctx, { ref, action: 'saved_text.updated', args: { renamed, edited } });
  return row;
}

export async function deleteSavedText(
  trx: TenantDb,
  ctx: RequestContext,
  ref: SavedTextRef,
): Promise<void> {
  await readSavedText(trx, ref);
  await trx
    .deleteFrom('saved_texts')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.savedTextId)
    .execute();
  await audit(trx, ctx, { ref, action: 'saved_text.deleted' });
}
