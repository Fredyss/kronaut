import type { ProviderRuntime } from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import { connectFinish, connectStart } from './connect.ts';
import { publishMessage } from './publish.ts';
import { type DiscordCredentials, deleteWebhook, discordCredentials } from './webhook.ts';

export const discordRuntime: ProviderRuntime<DiscordCredentials, DiscordMessageSettings> = {
  id: 'discord',

  parseCredentials: (value) => discordCredentials.parse(value),

  connectStart,

  connectFinish,

  revoke: deleteWebhook,

  publish: publishMessage,
};
