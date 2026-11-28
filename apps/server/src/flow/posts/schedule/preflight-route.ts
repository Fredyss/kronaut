import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { destinationRows } from '../../../access/post-access/locks.ts';
import { postUnits } from '../../../access/post-access/units.ts';
import { HttpError } from '../../../base/http/errors.ts';
import { PostParams, pathId } from '../../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../../base/http/request.ts';
import { draftItems } from '../../../steps/publish/snapshot.ts';
import type { PostRouteDeps } from '../deps.ts';
import { type Inspection, inspect } from './preflight.ts';
import { draftTargets, freezeTarget } from './targets.ts';

const PreflightSchema = z.object({
  postId: z.string(),
  version: z.number().int().positive(),
  issues: z.array(z.object({ path: z.string(), code: z.string() })),
  destinations: z.array(
    z.object({
      id: z.string(),
      accountId: z.string(),
      provider: z.string(),
      publishType: z.string(),
      items: z.array(
        z.object({
          role: z.enum(['main', 'thread', 'comment']),
          text: z.string(),
          mediaCount: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

const postPreflightRoute = defineRoute({
  id: 'posts.preflight',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/preflight',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: PostParams,
  response: PreflightSchema,
  summary: "Check a post's draft destinations without freezing them",
  description:
    "Runs the preflight that requesting approval and scheduling run, on every draft destination, and writes nothing. issues has the paths and codes of a 422 preflight_failed; empty means the draft passes. Each destination shows its text as it would be sent, with the channel's signature and before links are shortened. When a destination's provider is unavailable or its settings are invalid, only those issues come back and destinations is empty. 409 when the post has no draft destination.",
  tags: ['posts'],
});

async function currentPost(trx: TenantDb, workspaceId: string, postId: string) {
  const row = await trx
    .selectFrom('posts')
    .select(['id', 'version', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Post not found.');
  return row;
}

function previews(inspection: Inspection) {
  if (inspection.kind === 'blocked') return [];
  return inspection.checked.map(({ p, resolved }) => ({
    id: encodePublicId('destination', p.target.id),
    accountId: encodePublicId('socialAccount', p.target.socialAccountId),
    provider: p.target.provider,
    publishType: p.target.publishType,
    items: draftItems(resolved).map((item) => ({
      role: item.role,
      text: item.text,
      mediaCount: item.media.length,
    })),
  }));
}

export function preflightRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postPreflightRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const body = await ctx.tenant(async (trx) => {
        const post = await currentPost(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, post);
        ctx.authorize('posts:read', { workspaceId, postId, units });
        const rows = await destinationRows(trx, workspaceId, postId).execute();
        const inspection = await inspect(trx, deps.providers, {
          workspaceId,
          postId,
          postVersion: post.version,
          targets: draftTargets(rows, {}).map(freezeTarget),
          acknowledged: new Set(),
          reason: 'submit',
        });
        return {
          postId: encodePublicId('post', postId),
          version: post.version,
          issues: [...inspection.details],
          destinations: previews(inspection),
        };
      });
      return { body };
    }),
  ];
}
