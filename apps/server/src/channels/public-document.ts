import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { bindRoute } from '../http/types.ts';
import { selectAppId } from './connect.ts';
import { type ChannelRouteDeps, loadApp, oauthEntry, PROVIDER_ID, SYSTEM } from './deps.ts';

const DOCUMENT_CACHE = 'public, max-age=300';

export const publicDocumentRoute = defineRoute({
  id: 'oauth.public_document',
  method: 'GET',
  path: '/oauth/:provider/:name',
  auth: 'public',
  action: null,
  params: z.object({ provider: z.string(), name: z.string() }),
  response: z.record(z.string(), z.unknown()),
  summary: 'A public document the provider fetches, such as client metadata',
  tags: ['channels'],
});

export function bindPublicDocument(deps: ChannelRouteDeps) {
  return bindRoute(publicDocumentRoute, async ({ params }) => {
    const notFound = new HttpError('not_found', 'Not found.');
    const entry = PROVIDER_ID.test(params.provider)
      ? oauthEntry(deps.providers, params.provider)
      : undefined;
    if (entry?.runtime.publicDocuments === undefined) throw notFound;
    const appId = await deps.db.withActor(SYSTEM, (trx) => selectAppId(trx, params.provider));
    const app = appId === null ? null : await loadApp(deps, appId, { use: 'documents' });
    if (app === null) throw notFound;
    const all = entry.runtime.publicDocuments(app);
    const document = Object.hasOwn(all, params.name) ? all[params.name] : undefined;
    if (typeof document !== 'object' || document === null || Array.isArray(document)) {
      throw notFound;
    }
    return {
      body: document as Record<string, unknown>,
      headers: { 'cache-control': DOCUMENT_CACHE },
    };
  });
}
