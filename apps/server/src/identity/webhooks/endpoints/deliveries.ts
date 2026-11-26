import { decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../../../base/http/errors.ts';
import { issueDetails } from '../../../base/http/input.ts';
import { invalid } from '../../../base/http/issues.ts';
import type { EndpointRef } from './store.ts';

export const DELIVERIES_DEFAULT_LIMIT = 50;
export const DELIVERIES_MAX_LIMIT = 100;

const DELIVERY_STATES = ['pending', 'delivering', 'delivered', 'retry_wait', 'dead'] as const;
const WAITING: readonly string[] = ['pending', 'delivering', 'retry_wait'];

export const DeliveryPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      eventId: z.uuid(),
      eventType: z.string(),
      state: z.enum(DELIVERY_STATES),
      attemptCount: z.number().int().nonnegative(),
      lastHttpStatus: z.number().int().nullable(),
      lastError: z.string().nullable(),
      nextAttemptAt: z.iso.datetime().nullable(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

type DeliveryPage = z.output<typeof DeliveryPageSchema>;

const DeliveryQuery = z.strictObject({
  cursor: z.string().max(64).optional(),
  limit: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(DELIVERIES_MAX_LIMIT))
    .optional(),
});

export interface DeliveryFilter {
  readonly after: string | null;
  readonly limit: number;
}

export function deliveryFilter(
  query: Readonly<Record<string, string | undefined>>,
): DeliveryFilter {
  const present = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined));
  const parsed = DeliveryQuery.safeParse(present);
  if (!parsed.success) throw invalid(issueDetails('query', parsed.error));
  const { cursor, limit } = parsed.data;
  const after = cursor === undefined ? null : decodePublicId('webhookDelivery', cursor);
  if (cursor !== undefined && after === null) {
    throw invalid([{ path: 'query.cursor', code: 'invalid_cursor' }]);
  }
  return { after, limit: limit ?? DELIVERIES_DEFAULT_LIMIT };
}

async function assertEndpoint(trx: TenantDb, ref: EndpointRef): Promise<void> {
  const found = await trx
    .selectFrom('webhook_endpoints')
    .select('id')
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.endpointId)
    .executeTakeFirst();
  if (found === undefined) throw new HttpError('not_found', 'Not found.');
}

export async function listDeliveries(
  trx: TenantDb,
  ref: EndpointRef,
  filter: DeliveryFilter,
): Promise<DeliveryPage> {
  await assertEndpoint(trx, ref);
  let query = trx
    .selectFrom('webhook_deliveries as d')
    .innerJoin('webhook_events as e', (join) =>
      join.onRef('e.workspace_id', '=', 'd.workspace_id').onRef('e.id', '=', 'd.event_id'),
    )
    .select([
      'd.id',
      'd.event_id',
      'e.type',
      'd.state',
      'd.attempt_count',
      'd.last_http_status',
      'd.last_error',
      'd.next_attempt_at',
      'd.created_at',
      'd.updated_at',
    ])
    .where('d.workspace_id', '=', ref.workspaceId)
    .where('d.endpoint_id', '=', ref.endpointId);
  if (filter.after !== null) query = query.where('d.id', '<', filter.after);
  const rows = await query
    .orderBy('d.id', 'desc')
    .limit(filter.limit + 1)
    .execute();
  const page = rows.slice(0, filter.limit);
  const last = page.at(-1);
  return DeliveryPageSchema.parse({
    items: page.map((row) => ({
      id: encodePublicId('webhookDelivery', row.id),
      eventId: row.event_id,
      eventType: row.type,
      state: row.state,
      attemptCount: row.attempt_count,
      lastHttpStatus: row.last_http_status,
      lastError: row.last_error,
      nextAttemptAt: WAITING.includes(row.state) ? row.next_attempt_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
    nextCursor:
      rows.length > filter.limit && last !== undefined
        ? encodePublicId('webhookDelivery', last.id)
        : null,
  });
}
