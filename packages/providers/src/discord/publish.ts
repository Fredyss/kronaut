import type { PublishContext, PublishInput, PublishOutcome } from '@kronaut/core';
import * as z from 'zod';
import { discordFailure, isSuccess, messageUrl, snowflake } from '../_kit/discord/api.ts';
import { checkMessage, messageBody } from '../_kit/discord/message.ts';
import { type DiscordMessageSettings, SEND_MESSAGE_STEP } from '../_kit/discord/message-spec.ts';
import { readJson, send } from '../_kit/http.ts';
import { itemPath } from '../_kit/items.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { type DiscordCredentials, webhookUrl } from './webhook.ts';

type Input = PublishInput<DiscordCredentials, DiscordMessageSettings>;

const sentMessage = z.looseObject({ id: snowflake });
const state = z.looseObject({ message: z.object({ id: snowflake }).optional() });

function published({ guildId, channelId }: DiscordCredentials, id: string): PublishOutcome {
  return { kind: 'published', remoteId: id, url: messageUrl(guildId, channelId, id) };
}

export async function publishMessage(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  if (input.postType !== 'message') throw permanent('post_type_unsupported');
  const path = itemPath(input);
  if (path.kind !== 'main') throw permanent('reply_unsupported');
  const { credentials } = input;
  const done = state.safeParse(input.state).data?.message;
  if (done !== undefined) return published(credentials, done.id);
  checkMessage(path.item);
  const { contentType, body } = await messageBody(ctx, path.item, input.settings);
  const url = webhookUrl(credentials);
  url.searchParams.set('wait', 'true');
  const sent = await beginPublicSend(ctx, SEND_MESSAGE_STEP, input.state);
  const response = await send(ctx, 'public', url, {
    method: 'POST',
    headers: { 'content-type': contentType, accept: 'application/json' },
    body,
  });
  if (!isSuccess(response.status)) throw await discordFailure(response, 'public', ctx.now());
  const { id } = await readJson(response, sentMessage, 'public');
  await ctx.checkpoint({ ...sent, message: { id } });
  return published(credentials, id);
}
