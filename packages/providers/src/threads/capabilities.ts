import type { PostTypeSpec } from '@kronaut/core';
import * as z from 'zod';
import { scopeCapabilities } from '../_kit/meta-scopes.ts';

export const REPLIES_SCOPE = 'threads_manage_replies';
export const INSIGHTS_SCOPE = 'threads_manage_insights';

const replies = z.looseObject({ replies: z.literal(true) });

export function accountCapabilities(scopes: readonly string[]): Readonly<Record<string, unknown>> {
  return scopeCapabilities(scopes, { replies: REPLIES_SCOPE, insights: INSIGHTS_SCOPE });
}

export function accountPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  if (replies.safeParse(capabilities).success) return postType;
  const { thread: _thread, ...rest } = postType;
  return rest;
}
