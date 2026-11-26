import { randomUUID } from 'node:crypto';
import type { WebhookEventType } from '@kronaut/contract';
import type { Keyring } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { RequestContext } from '../../../base/http/request.ts';
import {
  openWebhookSecrets,
  sealWebhookSecrets,
} from '../../../infrastructure/credentials/webhook-secret.ts';
import { newSigningSecret } from './input.ts';
import {
  assertRoomForEndpoint,
  type EndpointRef,
  type EndpointRow,
  endpointById,
  lockEndpoint,
} from './store.ts';

export const PREVIOUS_SECRET_OVERLAP_HOURS = 24;

type Ctx = Pick<RequestContext, 'tenant' | 'requestId'>;

export interface EndpointActor {
  readonly ctx: Ctx;
  readonly keyring: Keyring;
  readonly workspaceId: string;
  readonly userId: string;
}

export interface NewEndpoint {
  readonly url: string;
  readonly events: readonly WebhookEventType[];
  readonly description: string | null;
}

export interface EndpointPatch {
  readonly url?: string | undefined;
  readonly events?: readonly WebhookEventType[] | undefined;
  readonly description?: string | null | undefined;
  readonly enabled?: boolean | undefined;
}

export interface WithSecret {
  readonly row: EndpointRow;
  readonly secret: string;
}

interface EndpointAudit {
  readonly action: string;
  readonly endpointId: string;
  readonly args?: Readonly<Record<string, unknown>>;
}

// The URL can carry a token and the secret never leaves the vault, so events name the endpoint by id only.
export async function auditEndpoint(
  trx: TenantDb,
  actor: EndpointActor,
  { action, endpointId, args }: EndpointAudit,
): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: actor.workspaceId,
      actor_kind: 'user',
      actor_id: actor.userId,
      surface: 'ui',
      action,
      resource_kind: 'webhook_endpoint',
      resource_id: endpointId,
      outcome: 'ok',
      args_summary: JSON.stringify(args ?? {}),
      correlation_id: randomUUID(),
      request_id: actor.ctx.requestId,
    })
    .execute();
}

export async function createEndpoint(
  actor: EndpointActor,
  input: NewEndpoint,
): Promise<WithSecret> {
  const { workspaceId, keyring } = actor;
  return await actor.ctx.tenant(async (trx) => {
    await assertRoomForEndpoint(trx, workspaceId);
    const id = randomUUID();
    const secret = newSigningSecret();
    await trx
      .insertInto('webhook_endpoints')
      .values({
        workspace_id: workspaceId,
        id,
        url: input.url,
        events: [...input.events],
        description: input.description,
        created_by_user_id: actor.userId,
        ...sealWebhookSecrets(
          keyring,
          { endpointId: id, workspaceId },
          { current: secret, previous: null },
        ),
      })
      .execute();
    await auditEndpoint(trx, actor, {
      action: 'webhook_endpoint.created',
      endpointId: id,
      args: { events: input.events },
    });
    return { row: await endpointById(trx, { workspaceId, endpointId: id }), secret };
  });
}

function enabledChange(row: EndpointRow, enabled: boolean | undefined) {
  if (enabled === undefined || enabled === row.enabled) return {};
  if (!enabled) return { enabled: false, disabled_reason: 'manual' };
  return { enabled: true, disabled_reason: null, consecutive_failures: 0, failing_since: null };
}

export async function updateEndpoint(
  actor: EndpointActor,
  ref: EndpointRef,
  patch: EndpointPatch,
): Promise<EndpointRow> {
  return await actor.ctx.tenant(async (trx) => {
    const row = await lockEndpoint(trx, ref);
    await trx
      .updateTable('webhook_endpoints')
      .set({
        ...(patch.url === undefined ? {} : { url: patch.url }),
        ...(patch.events === undefined ? {} : { events: [...patch.events] }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
        ...enabledChange(row, patch.enabled),
        updated_at: sql<Date>`now()`,
      })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.endpointId)
      .execute();
    const fields = Object.keys(patch).filter(
      (key) => patch[key as keyof EndpointPatch] !== undefined,
    );
    await auditEndpoint(trx, actor, {
      action: 'webhook_endpoint.updated',
      endpointId: ref.endpointId,
      args: { fields, ...(patch.events === undefined ? {} : { events: patch.events }) },
    });
    return await endpointById(trx, ref);
  });
}

async function sealedSecrets(trx: TenantDb, ref: EndpointRef) {
  return await trx
    .selectFrom('webhook_endpoints')
    .select([
      'secret_ciphertext',
      'secret_nonce',
      'secret_wrapped_dek',
      'kek_version',
      'previous_secret_ciphertext',
      'previous_secret_nonce',
      'previous_secret_wrapped_dek',
    ])
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.endpointId)
    .executeTakeFirstOrThrow();
}

// The old secret is opened and sealed again beside the new one, so both sit under the current KEK.
export async function rotateSecret(actor: EndpointActor, ref: EndpointRef): Promise<WithSecret> {
  const { keyring } = actor;
  const aad = { endpointId: ref.endpointId, workspaceId: ref.workspaceId };
  return await actor.ctx.tenant(async (trx) => {
    await lockEndpoint(trx, ref);
    const old = openWebhookSecrets(keyring, aad, await sealedSecrets(trx, ref), false);
    const secret = newSigningSecret();
    await trx
      .updateTable('webhook_endpoints')
      .set({
        ...sealWebhookSecrets(keyring, aad, { current: secret, previous: old.current }),
        previous_secret_expires_at: sql<Date>`now() + make_interval(hours => ${PREVIOUS_SECRET_OVERLAP_HOURS})`,
        updated_at: sql<Date>`now()`,
      })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.endpointId)
      .execute();
    await auditEndpoint(trx, actor, {
      action: 'webhook_endpoint.secret_rotated',
      endpointId: ref.endpointId,
    });
    return { row: await endpointById(trx, ref), secret };
  });
}

export async function deleteEndpoint(actor: EndpointActor, ref: EndpointRef): Promise<void> {
  await actor.ctx.tenant(async (trx) => {
    await lockEndpoint(trx, ref);
    await trx
      .deleteFrom('webhook_endpoints')
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.endpointId)
      .execute();
    await auditEndpoint(trx, actor, {
      action: 'webhook_endpoint.deleted',
      endpointId: ref.endpointId,
    });
  });
}
