import type { PublishContext, PublishInput, PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../http.ts';
import { itemPath } from '../items.ts';
import { permanent } from '../meta-graph.ts';
import { beginPublicSend } from '../public-send.ts';
import { type DiscordAuth, discordFailure, isSuccess, messageUrl, snowflake } from './api.ts';
import { checkMessage, type MessageFields, messageBody } from './message.ts';
import { type DiscordMessageSettings, SEND_MESSAGE_STEP } from './message-spec.ts';

export interface DiscordChannel {
  readonly guildId: string;
  readonly channelId: string;
}

export interface MessageTarget {
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly auth: DiscordAuth;
  readonly fields?: MessageFields;
}

const sentMessage = z.looseObject({ id: snowflake });
export const messageState = z.looseObject({
  sentAt: z.string().optional(),
  message: z.object({ id: snowflake }).optional(),
});

function publishedMessage({ guildId, channelId }: DiscordChannel, id: string): PublishOutcome {
  return { kind: 'published', remoteId: id, url: messageUrl(guildId, channelId, id) };
}

export async function publishDiscordMessage<C extends DiscordChannel>(
  ctx: PublishContext,
  input: PublishInput<C, DiscordMessageSettings>,
  target: () => MessageTarget,
): Promise<PublishOutcome> {
  if (input.postType !== 'message') throw permanent('post_type_unsupported');
  const path = itemPath(input);
  if (path.kind !== 'main') throw permanent('reply_unsupported');
  const { credentials } = input;
  const done = messageState.safeParse(input.state).data?.message;
  if (done !== undefined) return publishedMessage(credentials, done.id);
  checkMessage(path.item);
  const { url, headers, auth, fields } = target();
  const { contentType, body } = await messageBody(ctx, path.item, input.settings, fields);
  const sent = await beginPublicSend(ctx, SEND_MESSAGE_STEP, input.state);
  const response = await send(ctx, 'public', url, {
    method: 'POST',
    headers: { ...headers, 'content-type': contentType },
    body,
  });
  if (!isSuccess(response.status)) throw await discordFailure(response, 'public', ctx.now(), auth);
  const { id } = await readJson(response, sentMessage, 'public');
  await ctx.checkpoint({ ...sent, message: { id } });
  return publishedMessage(credentials, id);
}
