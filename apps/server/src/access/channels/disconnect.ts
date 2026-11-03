import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { HttpError } from '../../base/http/errors.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { enqueueRevoke } from '../../infrastructure/jobs/jobs.ts';

interface Disconnect {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly requestId: string;
}

async function revokeLater(trx: TenantDb, workspaceId: string, accountId: string) {
  const credentials = await trx
    .selectFrom('account_credentials')
    .select(['id', 'version'])
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId)
    .execute();
  for (const { id, version } of credentials) {
    await enqueueRevoke(trx, { workspaceId, id, version });
  }
}

export interface DisconnectTarget {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly reason: string;
}

export async function markDisconnected(trx: TenantDb, target: DisconnectTarget): Promise<void> {
  await trx
    .updateTable('social_accounts')
    .set({
      status: 'disconnected',
      status_reason: target.reason,
      status_changed_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', target.workspaceId)
    .where('id', '=', target.accountId)
    .execute();
}

export async function disconnect(
  trx: TenantDb,
  providers: ProviderRegistry,
  input: Disconnect,
): Promise<void> {
  const { workspaceId, accountId } = input;
  const account = await trx
    .selectFrom('social_accounts')
    .select(['status', 'provider'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .forUpdate()
    .executeTakeFirst();
  if (account === undefined) throw new HttpError('not_found', 'Not found.');
  if (account.status === 'disconnected') return;
  await markDisconnected(trx, { workspaceId, accountId, reason: 'user' });
  if (providers.get(account.provider)?.runtime.revoke !== undefined) {
    await revokeLater(trx, workspaceId, accountId);
  }
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'user',
      actor_id: input.userId,
      surface: 'ui',
      action: 'channel.disconnected',
      resource_kind: 'social_account',
      resource_id: accountId,
      social_account_ids: [accountId],
      outcome: 'ok',
      correlation_id: randomUUID(),
      request_id: input.requestId,
    })
    .execute();
}
