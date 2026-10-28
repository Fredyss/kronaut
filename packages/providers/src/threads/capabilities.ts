import type { PostTypeSpec } from '@kronaut/core';
import * as z from 'zod';

export const REPLIES_SCOPE = 'threads_manage_replies';

const replies = z.looseObject({ replies: z.literal(true) });

export function accountCapabilities(scopes: readonly string[]): Readonly<Record<string, unknown>> {
  return { replies: scopes.includes(REPLIES_SCOPE) };
}

export function accountPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  if (replies.safeParse(capabilities).success) return postType;
  const { thread: _thread, ...rest } = postType;
  return rest;
}
