import { createHash } from 'node:crypto';
import { decodePublicId, ID_PREFIXES, type IdKind } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from './errors.ts';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_KINDS = Object.keys(ID_PREFIXES) as IdKind[];

export interface IdempotencySlot {
  readonly workspaceId: string;
  readonly actorKey: string;
  readonly key: string;
}

export type Reservation =
  | { readonly kind: 'reserved' }
  | { readonly kind: 'replay'; readonly status: number; readonly body: unknown };

export function idempotencyKey(header: string | null): string {
  if (header === null) {
    throw new HttpError('idempotency_key_required', 'The Idempotency-Key header is required.');
  }
  if (!KEY_PATTERN.test(header)) {
    throw new HttpError(
      'invalid_request',
      'The Idempotency-Key header must be 8 to 128 characters of A-Z, a-z, 0-9, _ or -.',
    );
  }
  return header;
}

export function requestHash(
  routeId: string,
  path: string,
  rawQuery: string,
  rawBody: Uint8Array,
): Buffer {
  return createHash('sha256')
    .update(`${routeId}\n${path}\n${rawQuery}\n`, 'utf8')
    .update(rawBody)
    .digest();
}

function whereSlot(slot: IdempotencySlot) {
  return sql`workspace_id = ${slot.workspaceId} and actor_key = ${slot.actorKey} and key = ${slot.key}`;
}

export async function reserveIdempotency(
  db: TenantDb,
  slot: IdempotencySlot,
  hash: Buffer,
  now: Temporal.Instant,
): Promise<Reservation> {
  await sql`
    delete from idempotency_keys
     where ${whereSlot(slot)} and expires_at <= ${now.toString()}
  `.execute(db);
  const inserted = await db
    .insertInto('idempotency_keys')
    .values({
      workspace_id: slot.workspaceId,
      actor_key: slot.actorKey,
      key: slot.key,
      request_hash: hash,
      state: 'in_progress',
      expires_at: now.add({ milliseconds: IDEMPOTENCY_RETENTION_MS }).toString(),
    })
    .onConflict((oc) => oc.doNothing())
    .returning('key')
    .executeTakeFirst();
  if (inserted !== undefined) return { kind: 'reserved' };
  const row = await db
    .selectFrom('idempotency_keys')
    .select(['state', 'request_hash', 'response_status', 'response_body'])
    .where('workspace_id', '=', slot.workspaceId)
    .where('actor_key', '=', slot.actorKey)
    .where('key', '=', slot.key)
    .executeTakeFirst();
  if (row === undefined) {
    throw new HttpError('conflict', 'A request with this Idempotency-Key is still in progress.');
  }
  if (!Buffer.from(row.request_hash).equals(hash)) {
    throw new HttpError(
      'idempotency_key_reused',
      'This Idempotency-Key was already used for a different request.',
    );
  }
  if (row.state !== 'completed' || row.response_status === null) {
    throw new HttpError('conflict', 'A request with this Idempotency-Key is still in progress.');
  }
  return { kind: 'replay', status: row.response_status, body: row.response_body };
}

export function resourceIdOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('id' in body)) return null;
  const id = body.id;
  if (typeof id !== 'string') return null;
  if (UUID.test(id)) return id.toLowerCase();
  for (const kind of ID_KINDS) {
    const decoded = decodePublicId(kind, id);
    if (decoded !== null) return decoded;
  }
  return null;
}

export async function completeIdempotency(
  db: TenantDb,
  slot: IdempotencySlot,
  status: number,
  body: unknown,
): Promise<void> {
  const json = body === undefined ? null : JSON.stringify(body);
  await sql`
    update idempotency_keys
       set state = 'completed',
           response_status = ${status},
           response_body = cast(${json} as jsonb),
           resource_id = ${resourceIdOf(body)}
     where ${whereSlot(slot)}
  `.execute(db);
}
