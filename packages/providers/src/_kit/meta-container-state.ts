import type { PostTypeSpec, PublishContext, PublishInput, PublishItem } from '@kronaut/core';
import * as z from 'zod';
import { permanent } from './meta-graph.ts';

export interface MetaCredentials {
  readonly userId: string;
  readonly accessToken: string;
}

export type MetaInput = PublishInput<MetaCredentials, unknown>;

export interface Plan {
  readonly spec: PostTypeSpec;
  readonly item: PublishItem;
}

export const graphId = z.string().regex(/^\d{1,32}$/);
export const idField = z
  .union([graphId, z.number().int().nonnegative().refine(Number.isSafeInteger)])
  .transform(String);

export const publishState = z.object({
  children: z.record(z.string(), graphId).optional(),
  container: graphId.optional(),
  sentAt: z.iso.datetime().optional(),
});
export type State = z.infer<typeof publishState>;

export function parseState(state: unknown): State {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

export async function dropContainer(ctx: PublishContext, state: State): Promise<State> {
  const { container: _container, sentAt: _sentAt, children: _children, ...rest } = state;
  await ctx.checkpoint(rest);
  return rest;
}
