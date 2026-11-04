import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { bindRoute } from '../../base/http/request.ts';
import { type ChannelRef, requireChannel } from './channel-ref.ts';

const channelShortenLinksRoute = defineRoute({
  id: 'channels.set_shorten_links',
  method: 'PUT',
  path: '/v1/workspaces/:workspaceId/channels/:channelId/shorten-links',
  auth: 'session',
  action: 'settings:write',
  params: z.object({ workspaceId: z.string(), channelId: z.string() }),
  body: z.strictObject({ shortenLinks: z.boolean() }),
  response: z.object({ shortenLinks: z.boolean() }),
  idempotency: true,
  summary: "Turn a channel's short links on or off",
  description:
    "Whether links in posts frozen for this channel are shortened through the workspace's link shortener (on by default). Posts already frozen keep their choice. Owners and admins only.",
  tags: ['channels'],
});

interface ShortenChange {
  readonly ref: ChannelRef;
  readonly shortenLinks: boolean;
  readonly userId: string;
  readonly requestId: string;
}

async function setShortenLinks(trx: TenantDb, change: ShortenChange): Promise<void> {
  const { workspaceId, accountId } = change.ref;
  await requireChannel(trx, change.ref);
  await trx
    .updateTable('social_accounts')
    .set({ shorten_links: change.shortenLinks })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .execute();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'user',
      actor_id: change.userId,
      surface: 'ui',
      action: 'channel.shorten_links_updated',
      resource_kind: 'social_account',
      resource_id: accountId,
      social_account_ids: [accountId],
      outcome: 'ok',
      args_summary: JSON.stringify({ shorten_links: change.shortenLinks }),
      correlation_id: randomUUID(),
      request_id: change.requestId,
    })
    .execute();
}

export function bindShortenLinks() {
  return bindRoute(channelShortenLinksRoute, async ({ params, body }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('settings:write', { workspaceId });
    if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
    const accountId = decodePublicId('socialAccount', params.channelId);
    if (accountId === null) throw new HttpError('not_found', 'Not found.');
    const change = {
      ref: { workspaceId, accountId },
      shortenLinks: body.shortenLinks,
      userId: ctx.session.userId,
      requestId: ctx.requestId,
    };
    await ctx.tenant((trx) => setShortenLinks(trx, change));
    return { body: { shortenLinks: body.shortenLinks } };
  });
}
