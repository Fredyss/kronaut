import type { PublishContext, PublishOutcome } from '@kronaut/core';
import type { CommentPath } from '../_kit/items.ts';
import { commentCreated, objectId, planComment, runComment } from '../_kit/meta-comment.ts';
import { graphCall } from './graph.ts';
import { facebookManifest } from './manifest.ts';
import { graphUrl } from './oauth.ts';
import { type Input, pageOf, signedFields } from './publish-input.ts';

export async function publishComment(
  ctx: PublishContext,
  input: Input,
  path: CommentPath,
): Promise<PublishOutcome> {
  const { target, message } = planComment(facebookManifest, input, path, objectId);
  const page = pageOf(input);
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, ...signedFields(page) }).toString(),
  };
  const url = graphUrl(`${target}/comments`, {});
  return runComment(ctx, input.state, () =>
    graphCall(ctx, 'public', { url, init }, commentCreated),
  );
}
