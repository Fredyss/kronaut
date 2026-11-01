import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { MediaError } from './errors.ts';
import { createImport, findImport, MediaImportSchema } from './import-store.ts';
import { internalId } from './routes.ts';

const URL_MAX_LENGTH = 2048;

export const mediaImportCreateRoute = defineRoute({
  id: 'media.import_create',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/media/imports',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({ url: z.string(), aiGenerated: z.boolean().optional() }),
  response: MediaImportSchema,
  status: 202,
  idempotency: true,
  summary: 'Import media from a link',
  description:
    'Takes an `https` link of up to 2048 characters and answers at once; poll `media.import_get` for the result. The file type comes from the bytes. Images follow the upload limits; a video goes on to the usual conversion, so a finished import can show an asset that is still `processing`. At most 500 imports per workspace per hour. The link is never returned.',
  tags: ['media'],
});

export const mediaImportGetRoute = defineRoute({
  id: 'media.import_get',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/media/imports/:importId',
  auth: ['session', 'grant'],
  action: 'media:read',
  params: z.object({ workspaceId: z.string(), importId: z.string() }),
  response: MediaImportSchema,
  summary: 'Get a media import',
  tags: ['media'],
});

function checkImportUrl(value: string): string {
  const parsed = value.length > URL_MAX_LENGTH ? null : URL.parse(value);
  if (
    parsed === null ||
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.href.length > URL_MAX_LENGTH
  ) {
    throw new MediaError('invalid_request', 'url must be an https link without credentials', {
      details: [{ path: 'body.url', code: 'url_invalid' }],
    });
  }
  return parsed.href;
}

export function importRoutes(): BoundRoute[] {
  return [
    bindRoute(mediaImportCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      ctx.authorize('media:write', { workspaceId });
      const input = { url: checkImportUrl(body.url), aiGenerated: body.aiGenerated ?? false };
      const created = await ctx.tenant((trx) => createImport(trx, workspaceId, input));
      return { status: 202, body: created };
    }),
    bindRoute(mediaImportGetRoute, async ({ params }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      const importId = internalId('mediaImport', params.importId);
      // Same reasoning as media.get: nothing here carries a brand, location or account.
      if (ctx.authorize('media:read', { workspaceId }).kind === 'allow_scoped') {
        throw new MediaError('forbidden', 'media is not available to restricted principals');
      }
      return { body: await ctx.tenant((trx) => findImport(trx, workspaceId, importId)) };
    }),
  ];
}
