import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { bindRoute } from '../../base/http/request.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { disconnect } from './disconnect.ts';

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
