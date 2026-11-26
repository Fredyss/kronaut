import { WEBHOOK_API_VERSION, type WebhookEventType } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export const WEBHOOK_TEST_EVENT = 'webhook.test';

export interface EnvelopeInput {
  readonly workspaceId: string;
  readonly type: WebhookEventType | typeof WEBHOOK_TEST_EVENT;
  readonly dedupeKey: string;
  readonly subjectId?: string | undefined;
  readonly sequence?: number | undefined;
  readonly data: unknown;
}

export async function insertEnvelope(
  trx: TenantDb,
  event: EnvelopeInput,
): Promise<string | undefined> {
  const { workspaceId, type, dedupeKey, data } = event;
  const inserted = await sql<{ id: string }>`
    with e as (select uuidv7() as id, now() as at)
    insert into webhook_events
      (workspace_id, id, type, dedupe_key, subject_id, sequence, payload, occurred_at)
    select ${workspaceId}::uuid, e.id, ${type}::text, ${dedupeKey}::text,
           ${event.subjectId ?? null}::uuid, ${event.sequence ?? null}::integer,
           jsonb_build_object(
             'id', e.id,
             'type', ${type}::text,
             'created_at', to_char(e.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
             'api_version', ${WEBHOOK_API_VERSION}::text,
             'workspace_id', ${workspaceId}::uuid,
             'data', ${JSON.stringify(data)}::jsonb
           ),
           e.at
      from e
    on conflict (workspace_id, dedupe_key) do nothing
    returning id
  `.execute(trx);
  return inserted.rows[0]?.id;
}
