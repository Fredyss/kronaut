import { isProviderFailure, type ProviderState, type PublishContext } from '@kronaut/core';

export async function beginPublicSend<S extends ProviderState>(
  ctx: PublishContext,
  stepId: string,
  state: S,
): Promise<S & { readonly sentAt: string }> {
  await ctx.step(stepId);
  const sent = { ...state, sentAt: ctx.now().toString({ smallestUnit: 'millisecond' }) };
  await ctx.checkpoint(sent);
  return sent;
}

export async function afterSend<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    // The post is already live, so a failed read must not reach plan() and retry the send.
    if (isProviderFailure(error)) return undefined;
    throw error;
  }
}
