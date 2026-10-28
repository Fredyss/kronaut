import type {
  PostTypeSpec,
  ProviderManifest,
  PublishContext,
  PublishInput,
  PublishOutcome,
  TextLimit,
} from '@kronaut/core';
import * as z from 'zod';
import type { CommentPath } from './items.ts';
import { permanent } from './meta-graph.ts';

const COMMENT_STEPS = [{ id: 'create_comment', effect: 'public' }] as const;

export const objectId = z.string().regex(/^\d{1,32}(?:_\d{1,32})?$/);
export const commentCreated = z.looseObject({
  id: z
    .union([objectId, z.number().int().nonnegative().refine(Number.isSafeInteger)])
    .transform(String),
});

const commentState = z.object({ comment: objectId.optional() });
const commentsGranted = z.looseObject({ comments: z.literal(true) });

export interface CommentPlan {
  readonly target: string;
  readonly message: string;
}

export function firstComment(text: readonly TextLimit[]): NonNullable<PostTypeSpec['comment']> {
  return { text, steps: COMMENT_STEPS };
}

export function commentCapabilities(
  scopes: readonly string[],
  scope: string,
): Readonly<Record<string, unknown>> {
  return { comments: scopes.includes(scope) };
}

export function commentPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  if (commentsGranted.safeParse(capabilities).success) return postType;
  const { comment: _comment, ...rest } = postType;
  return rest;
}

export function planComment<S>(
  manifest: ProviderManifest<S>,
  input: PublishInput<unknown, S>,
  { item, main }: CommentPath,
  target: z.ZodType<string>,
): CommentPlan {
  const spec = manifest.postTypes.find((type) => type.id === input.postType);
  if (spec === undefined) throw permanent('post_type_unsupported');
  if (spec.comment === undefined) throw permanent('comment_unsupported');
  for (const limit of spec.comment.text) {
    if (limit.counting !== 'utf16') throw new Error(`${manifest.id} counts ${limit.counting}`);
    if (item.text.length > limit.max) throw permanent('text_too_long');
  }
  if (!target.safeParse(main.remoteId).success) throw permanent('comment_parent_missing');
  return { target: main.remoteId, message: item.text };
}

export async function runComment(
  ctx: PublishContext,
  state: unknown,
  create: () => Promise<{ readonly id: string }>,
): Promise<PublishOutcome> {
  const parsed = commentState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  const recorded = parsed.data.comment;
  if (recorded !== undefined) return { kind: 'published', remoteId: recorded };
  await ctx.step('create_comment');
  const { id } = await create();
  await ctx.checkpoint({ comment: id });
  return { kind: 'published', remoteId: id };
}
