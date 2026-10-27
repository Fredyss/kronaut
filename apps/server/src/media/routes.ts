import { defineRoute } from '@kronaut/contract';
import { decodePublicId, type IdKind } from '@kronaut/core';
import type { MediaStore } from '@kronaut/media';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { findMediaAsset, MediaAssetSchema, markAiGenerated } from './dto.ts';
import { MediaError } from './errors.ts';
import { ingestImage, MEDIA_IMAGE_MAX_BYTES, prepareImage } from './ingest.ts';

export const MEDIA_UPLOAD_ROUTE_ID = 'media.upload';
export const MEDIA_UPLOAD_BODY_LIMIT = 12 * 1024 * 1024;

const BASE64_MAX_LENGTH = Math.ceil(MEDIA_IMAGE_MAX_BYTES / 3) * 4;

export const FilenameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^\P{Cc}*$/u);

export const mediaUploadRoute = defineRoute({
  id: MEDIA_UPLOAD_ROUTE_ID,
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/media',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({
    filename: FilenameSchema.optional(),
    dataBase64: z.base64().min(1).max(BASE64_MAX_LENGTH),
    aiGenerated: z.boolean().optional(),
  }),
  response: MediaAssetSchema,
  status: 201,
  idempotency: true,
  summary: 'Upload an image',
  description:
    'Accepts JPEG, PNG or WebP up to 8 MiB; metadata is stripped before storage. `aiGenerated: true` marks the image as AI-generated; uploading the same image again never clears the mark.',
  tags: ['media'],
});

export const mediaGetRoute = defineRoute({
  id: 'media.get',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/media/:mediaId',
  auth: ['session', 'grant'],
  action: 'media:read',
  params: z.object({ workspaceId: z.string(), mediaId: z.string() }),
  response: MediaAssetSchema,
  summary: 'Get a media asset',
  tags: ['media'],
});

export const mediaMarkAiRoute = defineRoute({
  id: 'media.mark_ai',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/media/:mediaId/ai-generated',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: z.object({ workspaceId: z.string(), mediaId: z.string() }),
  response: MediaAssetSchema,
  summary: 'Mark a media asset as AI-generated',
  description: 'The mark is sticky: it is never removed once set.',
  tags: ['media'],
});

export interface MediaRouteDeps {
  readonly store: MediaStore;
  readonly clock: () => Temporal.Instant;
}

export function internalId(kind: IdKind, value: string): string {
  const id = decodePublicId(kind, value);
  if (id === null) throw new MediaError('not_found', 'not found');
  return id;
}

export function mediaRoutes(deps: MediaRouteDeps): BoundRoute[] {
  return [
    bindRoute(mediaUploadRoute, async ({ params, body }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      ctx.authorize('media:write', { workspaceId });
      const prepared = await prepareImage({
        bytes: Buffer.from(body.dataBase64, 'base64'),
        ...(body.filename === undefined ? {} : { filename: body.filename }),
      });
      const aiGenerated = body.aiGenerated ?? false;
      const asset = await ctx.tenant((trx) =>
        ingestImage(trx, deps.store, { workspaceId, aiGenerated }, prepared),
      );
      return { status: 201, body: asset };
    }),
    bindRoute(mediaGetRoute, async ({ params }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      const mediaId = internalId('media', params.mediaId);
      // Media carries no brand, location or account, so a scoped read has nothing to filter on.
      if (ctx.authorize('media:read', { workspaceId }).kind === 'allow_scoped') {
        throw new MediaError('forbidden', 'media is not available to restricted principals');
      }
      const asset = await ctx.tenant((trx) => findMediaAsset(trx, workspaceId, mediaId));
      if (asset === null) throw new MediaError('not_found', 'media asset not found');
      return { body: asset };
    }),
    bindRoute(mediaMarkAiRoute, async ({ params }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      const mediaId = internalId('media', params.mediaId);
      ctx.authorize('media:write', { workspaceId });
      const asset = await ctx.tenant((trx) => markAiGenerated(trx, workspaceId, mediaId));
      if (asset === null) throw new MediaError('not_found', 'media asset not found');
      return { body: asset };
    }),
  ];
}
