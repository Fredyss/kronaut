import { defineRoute } from '@kronaut/contract';
import { decodePublicId, encodePublicId, MAX_CONNECT_ACCOUNTS } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from '../../../base/http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../../base/http/request.ts';
import { persistConnections } from '../connect.ts';
import type { ChannelRouteDeps } from '../deps.ts';
import {
  dropSelection,
  MAX_SELECTION_CANDIDATES,
  readSelection,
  type Selection,
  type SelectionRequest,
} from './pending.ts';

const SELECTION_ID = /^[A-Za-z0-9_-]{43}$/;
const params = z.object({ workspaceId: z.string(), selectionId: z.string() });
const PATH = '/v1/workspaces/:workspaceId/channels/selections/:selectionId';

const selectionReadRoute = defineRoute({
  id: 'channels.selection_read',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'channels:connect',
  params,
  response: z.object({
    provider: z.string(),
    items: z.array(
      z.object({ id: z.string(), displayName: z.string(), handle: z.string().nullable() }),
    ),
  }),
  summary: 'List the accounts a connect offers to pick from',
  description:
    'For a network whose own dialog cannot pick the channels, the connect lists them here for 15 minutes. Only the person who connected sees them.',
  tags: ['channels'],
});

const selectionConfirmRoute = defineRoute({
  id: 'channels.selection_confirm',
  method: 'POST',
  path: `${PATH}/confirm`,
  auth: 'session',
  action: 'channels:connect',
  params,
  body: z.object({
    accounts: z.array(z.string().min(1).max(256)).min(1).max(MAX_SELECTION_CANDIDATES),
  }),
  response: z.object({ connected: z.array(z.string()) }),
  summary: 'Connect the picked accounts',
  description: `Connects the picked accounts as channels, at most ${MAX_CONNECT_ACCOUNTS}, and ends the selection.`,
  tags: ['channels'],
});

const selectionCancelRoute = defineRoute({
  id: 'channels.selection_cancel',
  method: 'DELETE',
  path: PATH,
  auth: 'session',
  action: 'channels:connect',
  params,
  response: z.undefined(),
  status: 204,
  summary: 'Discard a selection without connecting anything',
  tags: ['channels'],
});

function expired(): HttpError {
  return new HttpError('not_found', 'The selection expired. Connect again.');
}

function selectionRequest(
  ctx: RequestContext,
  raw: { readonly workspaceId: string; readonly selectionId: string },
): SelectionRequest {
  const workspaceId = decodePublicId('workspace', raw.workspaceId);
  if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
  ctx.authorize('channels:connect', { workspaceId });
  if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
  if (!SELECTION_ID.test(raw.selectionId)) throw expired();
  return { selectionId: raw.selectionId, workspaceId, userId: ctx.session.userId };
}

function accountsIssue(code: string): HttpError {
  return new HttpError('unprocessable', 'The picked accounts cannot be connected.', {
    details: [{ path: 'body.accounts', code }],
  });
}

function picked(selection: Selection, chosen: readonly string[]) {
  const offered = new Map(
    selection.accounts.map((account) => [account.providerAccountId, account] as const),
  );
  return chosen.map((id) => {
    const account = offered.get(id);
    if (account === undefined) throw accountsIssue('not_offered');
    return account;
  });
}

function bindRead(deps: ChannelRouteDeps) {
  return bindRoute(selectionReadRoute, async ({ params: raw }, ctx) => {
    const request = selectionRequest(ctx, raw);
    const selection = await ctx.tenant((trx) =>
      readSelection(trx, deps.keys.oauthPending, request),
    );
    if (selection === null) throw expired();
    const items = selection.accounts.map((account) => ({
      id: account.providerAccountId,
      displayName: account.displayName,
      handle: account.handle ?? null,
    }));
    return { body: { provider: selection.provider, items } };
  });
}

function bindConfirm(deps: ChannelRouteDeps) {
  return bindRoute(selectionConfirmRoute, async ({ params: raw, body }, ctx) => {
    const request = selectionRequest(ctx, raw);
    const chosen = [...new Set(body.accounts)];
    if (chosen.length > MAX_CONNECT_ACCOUNTS) throw accountsIssue('too_many_accounts');
    const ids = await ctx.tenant(async (trx) => {
      const selection = await readSelection(trx, deps.keys.oauthPending, {
        ...request,
        lock: true,
      });
      const entry = selection === null ? undefined : deps.providers.get(selection.provider);
      if (selection === null || entry === undefined) throw expired();
      const accounts = picked(selection, chosen);
      const target = {
        workspaceId: selection.workspaceId,
        userId: selection.userId,
        provider: entry.manifest.id,
        providerAppId: selection.providerAppId,
        clientKeyId: selection.clientKeyId,
        credentialKind: entry.manifest.auth.kind,
        requestId: ctx.requestId,
      };
      const saved = await persistConnections(trx, deps.keyring, target, accounts);
      await dropSelection(trx, request.selectionId);
      return saved;
    });
    return { body: { connected: ids.map((id) => encodePublicId('socialAccount', id)) } };
  });
}

function bindCancel(deps: ChannelRouteDeps) {
  return bindRoute(selectionCancelRoute, async ({ params: raw }, ctx) => {
    const request = selectionRequest(ctx, raw);
    await ctx.tenant(async (trx) => {
      const selection = await readSelection(trx, deps.keys.oauthPending, request);
      if (selection !== null) await dropSelection(trx, request.selectionId);
    });
    return { body: undefined };
  });
}

export function selectionRoutes(deps: ChannelRouteDeps): BoundRoute[] {
  return [bindRead(deps), bindConfirm(deps), bindCancel(deps)];
}
