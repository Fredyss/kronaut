import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { bindRoute } from '../http/types.ts';
import { enqueueRevoke } from '../jobs.ts';
import type { ProviderRegistry } from '../providers.ts';

export const channelDisconnectRoute = defineRoute({
  id: 'channels.disconnect',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/channels/:channelId/disconnect',
  auth: 'session',
  action: 'channels:disconnect',
  params: z.object({ workspaceId: z.string(), channelId: z.string() }),
  response: z.undefined(),
  status: 204,
  idempotency: false,
  summary: 'Disconnect a channel',
  description:
    'The channel stops publishing; due posts to it are blocked. Where the network supports it, its access token is revoked there; its stored credentials are purged after 30 days. Connecting the same account again restores it. Owners and admins only.',
  tags: ['channels'],
});

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

async function disconnect(
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
  await trx
    .updateTable('social_accounts')
    .set({ status: 'disconnected', status_reason: 'user', status_changed_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .execute();
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

export function bindDisconnect(providers: ProviderRegistry) {
  return bindRoute(channelDisconnectRoute, async ({ params }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('channels:disconnect', { workspaceId });
    if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
    const accountId = decodePublicId('socialAccount', params.channelId);
    if (accountId === null) throw new HttpError('not_found', 'Not found.');
    const input = { workspaceId, accountId, userId: ctx.session.userId, requestId: ctx.requestId };
    await ctx.tenant((trx) => disconnect(trx, providers, input));
    return { body: undefined };
  });
}
