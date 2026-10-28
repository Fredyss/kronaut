import type { PublishContext, PublishOutcome } from '@kronaut/core';
import type { CommentPath } from '../_kit/items.ts';
import { commentCreated, planComment, runComment } from '../_kit/meta-comment.ts';
import { graphId } from '../_kit/meta-container-state.ts';
import { graph } from './graph-call.ts';
import { instagramManifest } from './manifest.ts';
import { COMMENTS_SCOPE, permanent } from './oauth.ts';
import type { Input } from './publish-input.ts';

export async function publishComment(
  ctx: PublishContext,
  input: Input,
  path: CommentPath,
): Promise<PublishOutcome> {
  if (!input.credentials.scopes.includes(COMMENTS_SCOPE))
    throw permanent('comments_permission_missing');
  const { target, message } = planComment(instagramManifest, input, path, graphId);
  return runComment(ctx, input.state, () =>
    graph.call(ctx, {
      effect: 'public',
      url: graph.versioned(`${target}/comments`, input),
      schema: commentCreated,
      form: { message },
    }),
  );
}
