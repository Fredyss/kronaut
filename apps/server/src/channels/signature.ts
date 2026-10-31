import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { bindRoute } from '../http/types.ts';
import { type ChannelRef, requireChannel } from './channel-ref.ts';
import { loadSignatures, SignatureSchema } from './signature-read.ts';

export const channelSignatureRoute = defineRoute({
  id: 'channels.set_signature',
  method: 'PUT',
  path: '/v1/workspaces/:workspaceId/channels/:channelId/saved-text',
  auth: 'session',
  action: 'settings:write',
  params: z.object({ workspaceId: z.string(), channelId: z.string() }),
  body: z.strictObject({ savedTextId: z.string().nullable() }),
  response: z.object({ signature: SignatureSchema.nullable() }),
  idempotency: true,
  summary: "Set a channel's signature",
  description:
    'A saved text added after the main text of every post frozen for this channel, or null for none. Posts already frozen keep theirs. An unknown saved text is 422. Owners and admins only.',
  tags: ['channels'],
});

function unknownText(): HttpError {
  return new HttpError('unprocessable', 'The saved text was not found.', {
    details: [{ path: 'body.savedTextId', code: 'not_found' }],
  });
}

// The share lock stops a concurrent delete from turning the foreign key into a 500.
async function requireSavedText(trx: TenantDb, workspaceId: string, value: string) {
  const id = decodePublicId('savedText', value);
  if (id === null) throw unknownText();
  const row = await trx
    .selectFrom('saved_texts')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .forKeyShare()
    .executeTakeFirst();
  if (row === undefined) throw unknownText();
  return row.id;
}

interface SignatureChange {
  readonly ref: ChannelRef;
  readonly savedTextId: string | null;
  readonly userId: string;
  readonly requestId: string;
}

async function setSignature(trx: TenantDb, change: SignatureChange) {
  const { workspaceId, accountId } = change.ref;
  await requireChannel(trx, change.ref);
  const savedTextId =
    change.savedTextId === null
      ? null
      : await requireSavedText(trx, workspaceId, change.savedTextId);
  await trx
    .updateTable('social_accounts')
    .set({ saved_text_id: savedTextId })
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
      action: 'channel.signature_updated',
      resource_kind: 'social_account',
      resource_id: accountId,
      social_account_ids: [accountId],
      outcome: 'ok',
      args_summary: JSON.stringify({ saved_text_id: savedTextId }),
      correlation_id: randomUUID(),
      request_id: change.requestId,
    })
    .execute();
  if (savedTextId === null) return null;
  const signatures = await loadSignatures(trx, workspaceId, [savedTextId]);
  return signatures.get(savedTextId) ?? null;
}

export function bindSignature() {
  return bindRoute(channelSignatureRoute, async ({ params, body }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('settings:write', { workspaceId });
    if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
    const accountId = decodePublicId('socialAccount', params.channelId);
    if (accountId === null) throw new HttpError('not_found', 'Not found.');
    const change = {
      ref: { workspaceId, accountId },
      savedTextId: body.savedTextId,
      userId: ctx.session.userId,
      requestId: ctx.requestId,
    };
    const signature = await ctx.tenant((trx) => setSignature(trx, change));
    return { body: { signature } };
  });
}
