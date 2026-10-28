import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import type { MediaSigner } from './access.ts';
import { ALT_TEXT_MAX, findMediaAsset } from './dto.ts';
import { MediaError } from './errors.ts';
import {
  LIBRARY_DEFAULT_LIMIT,
  LIBRARY_MAX_LIMIT,
  LibraryPageSchema,
  libraryFilter,
  listLibrary,
  USAGE_MAX_POSTS,
  UsageSchema,
  usageOf,
} from './library.ts';
import { clearAiGenerated, normalizeAltText, softDelete, updateAltText } from './library-edit.ts';
import { findLibraryAsset, LibraryAssetSchema } from './preview.ts';
import { internalId } from './routes.ts';

const WORKSPACE = z.object({ workspaceId: z.string() });
const ASSET = z.object({ workspaceId: z.string(), mediaId: z.string() });
const ASSET_PATH = '/v1/workspaces/:workspaceId/media/:mediaId';

export const mediaListRoute = defineRoute({
  id: 'media.list',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/media',
  auth: ['session', 'grant'],
  action: 'media:read',
  params: WORKSPACE,
  query: z.object({
    kind: z.enum(['image', 'video']).optional(),
    cursor: z.string().optional(),
    limit: z.string().optional(),
  }),
  response: LibraryPageSchema,
  summary: 'List the media library',
  description: `The workspace's library assets that are ready or processing, not deleted and not a duplicate, newest first, optionally of one kind (image or video). limit 1–${LIBRARY_MAX_LIMIT}, default ${LIBRARY_DEFAULT_LIMIT}; pass nextCursor as cursor for the next page. usageCount is the number of posts that use the asset; previewUrl is a signed URL of the image, or of a video's poster, valid for an hour.`,
  tags: ['media'],
});

export const mediaUsageRoute = defineRoute({
  id: 'media.usage',
  method: 'GET',
  path: `${ASSET_PATH}/usage`,
  auth: ['session', 'grant'],
  action: 'media:read',
  params: ASSET,
  response: UsageSchema,
  summary: 'List the posts that use a media asset',
  description: `At most ${USAGE_MAX_POSTS} posts, newest first. Needs posts:read as well; refused for a scoped caller.`,
  tags: ['media'],
});

export const mediaUpdateRoute = defineRoute({
  id: 'media.update',
  method: 'PATCH',
  path: ASSET_PATH,
  auth: ['session', 'grant'],
  action: 'media:write',
  params: ASSET,
  body: z.object({
    altText: z
      .string()
      .max(4 * ALT_TEXT_MAX)
      .nullable()
      .optional(),
  }),
  response: LibraryAssetSchema,
  summary: 'Update a media asset',
  description: `Sets the default alt text (trimmed, at most ${ALT_TEXT_MAX} characters; empty or null clears it). Alt text already copied into a post doesn't change.`,
  tags: ['media'],
});

export const mediaClearAiRoute = defineRoute({
  id: 'media.clear_ai',
  method: 'DELETE',
  path: `${ASSET_PATH}/ai-generated`,
  auth: 'session',
  action: 'media:write',
  params: ASSET,
  response: LibraryAssetSchema,
  summary: 'Remove the AI-generated mark',
  description:
    'Members only. Refused with 409 when the asset is not marked, or when an API key or agent uploaded or marked it.',
  tags: ['media'],
});

export const mediaDeleteRoute = defineRoute({
  id: 'media.delete',
  method: 'DELETE',
  path: ASSET_PATH,
  auth: 'session',
  action: 'media:write',
  params: ASSET,
  response: z.undefined(),
  status: 204,
  summary: 'Delete a media asset',
  description:
    'Refused with 409 media_in_use while any post uses the asset. The files are removed 30 days later.',
  tags: ['media'],
});

function readable(ctx: RequestContext, workspaceId: string): void {
  // Media carries no brand, location or account, so a scoped read has nothing to filter on.
  if (ctx.authorize('media:read', { workspaceId }).kind === 'allow_scoped') {
    throw new MediaError('forbidden', 'media is not available to restricted principals');
  }
}

function target(params: z.output<typeof ASSET>) {
  const workspaceId = internalId('workspace', params.workspaceId);
  return { workspaceId, mediaId: internalId('media', params.mediaId) };
}

export interface LibraryRouteDeps {
  readonly signer: MediaSigner;
}

export function libraryRoutes({ signer }: LibraryRouteDeps): BoundRoute[] {
  return [
    bindRoute(mediaListRoute, async ({ params, query }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      readable(ctx, workspaceId);
      const filter = libraryFilter(query);
      return { body: await ctx.tenant((trx) => listLibrary(trx, { signer, workspaceId }, filter)) };
    }),
    bindRoute(mediaUsageRoute, async ({ params }, ctx) => {
      const { workspaceId, mediaId } = target(params);
      readable(ctx, workspaceId);
      // The usage list shows post titles and text, so it needs post read access as well.
      if (ctx.authorize('posts:read', { workspaceId }).kind === 'allow_scoped') {
        throw new MediaError('forbidden', 'post usage is not available to restricted principals');
      }
      const usage = await ctx.tenant(async (trx) => {
        if ((await findMediaAsset(trx, workspaceId, mediaId)) === null) {
          throw new MediaError('not_found', 'media asset not found');
        }
        return await usageOf(trx, workspaceId, mediaId);
      });
      return { body: usage };
    }),
    bindRoute(mediaUpdateRoute, async ({ params, body }, ctx) => {
      const asset = target(params);
      ctx.authorize('media:write', { workspaceId: asset.workspaceId });
      const { altText } = body;
      const normalized = altText === undefined ? undefined : normalizeAltText(altText);
      const updated = await ctx.tenant(async (trx) => {
        await updateAltText(trx, ctx, asset, normalized);
        return await findLibraryAsset(trx, signer, asset.workspaceId, asset.mediaId);
      });
      return { body: updated };
    }),
    bindRoute(mediaClearAiRoute, async ({ params }, ctx) => {
      const asset = target(params);
      ctx.authorize('media:write', { workspaceId: asset.workspaceId });
      const cleared = await ctx.tenant(async (trx) => {
        await clearAiGenerated(trx, ctx, asset);
        return await findLibraryAsset(trx, signer, asset.workspaceId, asset.mediaId);
      });
      return { body: cleared };
    }),
    bindRoute(mediaDeleteRoute, async ({ params }, ctx) => {
      const asset = target(params);
      ctx.authorize('media:write', { workspaceId: asset.workspaceId });
      await ctx.tenant((trx) => softDelete(trx, ctx, asset));
      return { body: undefined };
    }),
  ];
}
