import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { writePostAudit } from '../audit/write.ts';
import type { IssueDetail } from '../http/errors.ts';
import { unprocessable } from '../http/issues.ts';
import { PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { lockCurrent, type PostRef } from '../posts/locks.ts';
import { postUnits } from '../posts/units.ts';
import { loadPostTags, PostTagSchema, tagFields } from './read.ts';

const MAX_POST_TAGS = 20;

export const postTagsReplaceRoute = defineRoute({
  id: 'posts.tags_replace',
  method: 'PUT',
  path: '/v1/workspaces/:workspaceId/posts/:postId/tags',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: PostParams,
  body: z.strictObject({ tagIds: z.array(z.string()).max(MAX_POST_TAGS) }),
  response: z.object({ tags: z.array(PostTagSchema) }),
  idempotency: true,
  summary: "Replace a post's tags",
  description: `Tags are internal and never published, so this works in any state, doesn't change the post's version and leaves an approval alone. At most ${MAX_POST_TAGS} tags, each of this workspace (422 tag_unknown at the id). 404 for a deleted post.`,
  tags: ['posts'],
});

async function knownTags(trx: TenantDb, workspaceId: string, publicIds: readonly string[]) {
  const ids = publicIds.map((id) => decodePublicId('tag', id));
  const decoded = ids.filter((id) => id !== null);
  const rows =
    decoded.length === 0
      ? []
      : await trx
          .selectFrom('tags')
          .select('id')
          .where('workspace_id', '=', workspaceId)
          .where('id', 'in', decoded)
          .forKeyShare()
          .execute();
  const known = new Set(rows.map((row) => row.id));
  const details: IssueDetail[] = ids.flatMap((id, index) =>
    id !== null && known.has(id) ? [] : [{ path: `body.tagIds.${index}`, code: 'tag_unknown' }],
  );
  if (details.length > 0) throw unprocessable(details);
  return known;
}

async function currentTags(trx: TenantDb, { workspaceId, postId }: PostRef) {
  const rows = await trx
    .selectFrom('post_tags')
    .select('tag_id')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .execute();
  return new Set(rows.map((row) => row.tag_id));
}

async function applyChange(
  trx: TenantDb,
  { workspaceId, postId }: PostRef,
  added: readonly string[],
  removed: readonly string[],
): Promise<void> {
  if (removed.length > 0) {
    await trx
      .deleteFrom('post_tags')
      .where('workspace_id', '=', workspaceId)
      .where('post_id', '=', postId)
      .where('tag_id', 'in', removed)
      .execute();
  }
  if (added.length > 0) {
    await trx
      .insertInto('post_tags')
      .values(added.map((tag_id) => ({ workspace_id: workspaceId, post_id: postId, tag_id })))
      .execute();
  }
}

async function replaceTags(
  trx: TenantDb,
  ctx: RequestContext,
  post: PostRef,
  tagIds: readonly string[],
) {
  const { workspaceId, postId } = post;
  const locked = await lockCurrent(trx, workspaceId, postId);
  const units = await postUnits(trx, workspaceId, locked);
  ctx.authorize('posts:draft', { workspaceId, postId, units });
  const wanted = await knownTags(trx, workspaceId, tagIds);
  const current = await currentTags(trx, post);
  const added = [...wanted].filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !wanted.has(id));
  if (added.length + removed.length > 0) {
    await applyChange(trx, post, added, removed);
    await writePostAudit(trx, {
      ctx,
      post,
      action: 'post.tags_changed',
      postVersion: locked.version,
      args: { added, removed, count: wanted.size },
    });
  }
  const loaded = await loadPostTags(trx, workspaceId, [postId]);
  return (loaded.get(postId) ?? []).map(tagFields);
}

export function postTagRoutes(): BoundRoute[] {
  return [
    bindRoute(postTagsReplaceRoute, async ({ params, body }, ctx) => {
      const post = {
        workspaceId: pathId('workspace', params.workspaceId),
        postId: pathId('post', params.postId),
      };
      const tags = await ctx.tenant((trx) => replaceTags(trx, ctx, post, body.tagIds));
      return { body: { tags: z.array(PostTagSchema).parse(tags) } };
    }),
  ];
}
