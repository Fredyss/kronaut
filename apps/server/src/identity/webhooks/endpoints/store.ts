import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../../base/http/errors.ts';

export const WORKSPACE_MAX = 20;

export interface EndpointRow {
  readonly id: string;
  readonly url: string;
  readonly description: string | null;
  readonly events: string[];
  readonly enabled: boolean;
  readonly disabled_reason: string | null;
  readonly consecutive_failures: number;
  readonly failing_since: Date | null;
  readonly previous_secret_expires_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export interface EndpointRef {
  readonly workspaceId: string;
  readonly endpointId: string;
}

const COLUMNS = [
  'id',
  'url',
  'description',
  'events',
  'enabled',
  'disabled_reason',
  'consecutive_failures',
  'failing_since',
  'previous_secret_expires_at',
  'created_at',
  'updated_at',
] as const;

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function endpointDto(row: EndpointRow, now: Temporal.Instant) {
  const expiresAt = row.previous_secret_expires_at;
  const overlapping = expiresAt !== null && expiresAt.getTime() > now.epochMilliseconds;
  return {
    id: encodePublicId('webhookEndpoint', row.id),
    url: row.url,
    description: row.description,
    events: row.events,
    enabled: row.enabled,
    disabledReason: row.enabled ? null : row.disabled_reason,
    consecutiveFailures: row.consecutive_failures,
    failingSince: iso(row.failing_since),
    previousSecretExpiresAt: overlapping ? iso(row.previous_secret_expires_at) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function listEndpoints(trx: TenantDb, workspaceId: string): Promise<EndpointRow[]> {
  return trx
    .selectFrom('webhook_endpoints')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
}

export async function lockEndpoint(trx: TenantDb, ref: EndpointRef): Promise<EndpointRow> {
  const row = await trx
    .selectFrom('webhook_endpoints')
    .select(COLUMNS)
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.endpointId)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Not found.');
  return row;
}

export async function endpointById(trx: TenantDb, ref: EndpointRef): Promise<EndpointRow> {
  return await trx
    .selectFrom('webhook_endpoints')
    .select(COLUMNS)
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.endpointId)
    .executeTakeFirstOrThrow();
}

export async function assertRoomForEndpoint(trx: TenantDb, workspaceId: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtextextended(${`webhook_endpoints:${workspaceId}`}, 0))`.execute(
    trx,
  );
  const { total } = await trx
    .selectFrom('webhook_endpoints')
    .select(sql<number>`count(*)::integer`.as('total'))
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirstOrThrow();
  if (total >= WORKSPACE_MAX) {
    throw new HttpError('conflict', `A workspace has at most ${WORKSPACE_MAX} webhook endpoints.`, {
      details: [{ path: 'body', code: 'webhook_limit' }],
    });
  }
}
