import type { PublishContext, PublishInput, PublishOutcome } from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import { publishDiscordMessage } from '../_kit/discord/publish.ts';
import { botHeaders, channelMessagesUrl, type DiscordBotCredentials, messageNonce } from './bot.ts';

export type Input = PublishInput<DiscordBotCredentials, DiscordMessageSettings>;

export async function publishMessage(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  return await publishDiscordMessage(ctx, input, () => ({
    url: channelMessagesUrl(input.credentials.channelId),
    headers: botHeaders(input.app),
    auth: 'bot',
    fields: { nonce: messageNonce(input.destinationId), enforce_nonce: true },
  }));
}
