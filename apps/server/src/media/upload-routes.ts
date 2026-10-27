import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { MediaAssetSchema } from './dto.ts';
import {
  FilenameSchema,
  internalId,
  MEDIA_UPLOAD_BODY_LIMIT,
  MEDIA_UPLOAD_ROUTE_ID,
} from './routes.ts';
import type { Staging } from './staging.ts';
import { completeUpload, createVideoUpload, receivePart, VIDEO_PART_SIZE } from './upload.ts';

export const VIDEO_PART_ROUTE_ID = 'media.video_part';

export const MEDIA_BODY_LIMITS: Readonly<Record<string, number>> = {
  [MEDIA_UPLOAD_ROUTE_ID]: MEDIA_UPLOAD_BODY_LIMIT,
  [VIDEO_PART_ROUTE_ID]: VIDEO_PART_SIZE,
};

const MediaParams = z.object({ workspaceId: z.string(), mediaId: z.string() });

export const videoUploadRoute = defineRoute({
  id: 'media.video_upload',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/media/uploads',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({
    kind: z.literal('video'),
    bytes: z.number().int().positive(),
    mime: z.string(),
    filename: FilenameSchema.optional(),
    aiGenerated: z.boolean().optional(),
  }),
  response: z.object({
    media: MediaAssetSchema,
    partSize: z.number().int().positive(),
    partCount: z.number().int().positive(),
    expiresAt: z.iso.datetime(),
  }),
  status: 201,
  idempotency: true,
  summary: 'Start a chunked video upload',
  description:
    'Accepts MP4, QuickTime or WebM up to 300 MB. Send every part with `media.video_part`, then call `media.video_complete` before `expiresAt` (24 h).',
  tags: ['media'],
});

export const videoPartRoute = defineRoute({
  id: VIDEO_PART_ROUTE_ID,
  method: 'PUT',
  path: '/v1/workspaces/:workspaceId/media/:mediaId/parts/:part',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: MediaParams.extend({ part: z.string().regex(/^[1-9][0-9]{0,5}$/) }),
  body: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength > 0),
  bodyEncoding: 'octet-stream',
  idempotency: false,
  response: z.object({ part: z.number().int().positive(), bytes: z.number().int().positive() }),
  summary: 'Upload one part of a video',
  description:
    'Every part except the last is exactly `partSize` bytes. Sending a part again replaces it.',
  tags: ['media'],
});

export const videoCompleteRoute = defineRoute({
  id: 'media.video_complete',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/media/:mediaId/complete',
  auth: ['session', 'grant'],
  action: 'media:write',
  params: MediaParams,
  response: MediaAssetSchema,
  idempotency: true,
  summary: 'Complete a chunked video upload',
  description:
    'Checks that every part is present and queues the conversion. Completing again is a no-op.',
  tags: ['media'],
});

export interface UploadRouteDeps {
  readonly staging: Staging;
}

export function uploadRoutes({ staging }: UploadRouteDeps): BoundRoute[] {
  return [
    bindRoute(videoUploadRoute, async ({ params, body }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      ctx.authorize('media:write', { workspaceId });
      const upload = await ctx.tenant((trx) => createVideoUpload(trx, workspaceId, body));
      return { status: 201, body: upload };
    }),
    bindRoute(videoPartRoute, async ({ params, body }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      const mediaId = internalId('media', params.mediaId);
      ctx.authorize('media:write', { workspaceId });
      const part = Number(params.part);
      await receivePart(ctx, staging, { workspaceId, mediaId, part }, body);
      return { body: { part, bytes: body.byteLength } };
    }),
    bindRoute(videoCompleteRoute, async ({ params }, ctx) => {
      const workspaceId = internalId('workspace', params.workspaceId);
      const mediaId = internalId('media', params.mediaId);
      ctx.authorize('media:write', { workspaceId });
      const asset = await ctx.tenant((trx) =>
        completeUpload(trx, staging, { workspaceId, mediaId }),
      );
      return { body: asset };
    }),
  ];
}
