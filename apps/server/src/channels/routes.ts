import { decodePublicId } from '@kronaut/core';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { bindConnectCallback } from './connect-callback.ts';
import { bindConnectStart } from './connect-start.ts';
import { type ChannelRouteDeps, connectsByRedirect, SYSTEM } from './deps.ts';
import { bindDisconnect } from './disconnect.ts';
import { channelListRoute, channelProvidersRoute, listChannels, readyProviders } from './list.ts';
import { bindPublicDocument } from './public-document.ts';

export { CONNECT_ERRORS, type ConnectError, connectCallbackRoute } from './connect-callback.ts';
export { connectStartRoute } from './connect-start.ts';
export type { ChannelRouteDeps } from './deps.ts';
export { publicDocumentRoute } from './public-document.ts';

function bindList(deps: ChannelRouteDeps) {
  return bindRoute(channelListRoute, async ({ params }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    const decision = ctx.authorize('channels:read', { workspaceId });
    const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
    const items = await ctx.tenant((trx) => listChannels(trx, workspaceId, scope, deps.providers));
    return { body: { items } };
  });
}

function bindConnectable(deps: ChannelRouteDeps) {
  return bindRoute(channelProvidersRoute, async ({ params }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('channels:connect', { workspaceId });
    const ready = await deps.db.withActor(SYSTEM, (trx) => readyProviders(trx, deps.providers));
    const items: { id: string; availability: 'stable' | 'experimental' | 'limited' }[] = [];
    for (const { manifest } of deps.providers.list()) {
      const { state } = manifest.availability;
      if (!connectsByRedirect(manifest) || state === 'unavailable') continue;
      if (ready.has(manifest.id)) items.push({ id: manifest.id, availability: state });
    }
    items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { body: { items } };
  });
}

export function channelRoutes(deps: ChannelRouteDeps): BoundRoute[] {
  return [
    bindConnectStart(deps),
    bindConnectCallback(deps),
    bindPublicDocument(deps),
    bindList(deps),
    bindConnectable(deps),
    bindDisconnect(deps.providers),
  ];
}
