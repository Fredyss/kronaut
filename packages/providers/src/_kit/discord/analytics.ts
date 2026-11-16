import {
  type AnalyticsResult,
  type BaseContext,
  type PostMetrics,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import { countOf, eachPost } from '../analytics.ts';
import { readJson, send } from '../http.ts';
import { permanent } from '../meta-graph.ts';
import { discordFailure, isSuccess, snowflake } from './api.ts';
import type { MessageTarget } from './publish.ts';

type MessageRead = Omit<MessageTarget, 'fields'>;

const CHANNEL_WIDE: ReadonlySet<string> = new Set(['missing_access', 'missing_permissions']);

const message = z.looseObject({
  reactions: z.array(z.looseObject({ count: z.unknown() })).nullish(),
});

function reactionMetrics(reactions: readonly { readonly count: unknown }[]): PostMetrics {
  let total = 0;
  for (const reaction of reactions) {
    const count = countOf(reaction.count);
    if (count === null) return { reactions: null };
    total += count;
  }
  return { reactions: countOf(total) };
}

// Missing access is about the channel, not the message: stop the channel for this run instead of ending every post's pulls.
async function readFailure(
  response: Parameters<typeof discordFailure>[0],
  ctx: BaseContext,
  auth: MessageRead['auth'],
): Promise<ProviderFailure> {
  const failure = await discordFailure(response, 'none', ctx.now(), auth);
  const { error } = failure;
  return error.kind === 'permanent' && CHANNEL_WIDE.has(error.code)
    ? new ProviderFailure({ kind: 'auth_revoked' })
    : failure;
}

export function messageAnalytics(
  ctx: BaseContext,
  remoteIds: readonly string[],
  target: (messageId: string) => MessageRead,
  apiVersion: string,
): Promise<AnalyticsResult> {
  return eachPost(
    remoteIds,
    async (id) => {
      if (!snowflake.safeParse(id).success) throw permanent('remote_id_invalid');
      const { url, headers, auth } = target(id);
      const response = await send(ctx, 'none', url, { headers });
      if (!isSuccess(response.status)) throw await readFailure(response, ctx, auth);
      const { reactions } = await readJson(response, message, 'none');
      return reactionMetrics(reactions ?? []);
    },
    apiVersion,
  );
}
