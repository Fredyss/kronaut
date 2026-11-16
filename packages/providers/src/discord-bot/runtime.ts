import type { ProviderRuntime } from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import { type DiscordBotCredentials, discordBotCredentials } from './bot.ts';
import { connectFinish, connectStart } from './connect.ts';
import { publishMessage } from './publish.ts';
import { verifyMessage } from './verify.ts';

export const discordBotRuntime: ProviderRuntime<DiscordBotCredentials, DiscordMessageSettings> = {
  id: 'discord_bot',

  parseCredentials: (value) => discordBotCredentials.parse(value),

  connectStart,

  connectFinish,

  publish: publishMessage,

  verify: verifyMessage,
};
