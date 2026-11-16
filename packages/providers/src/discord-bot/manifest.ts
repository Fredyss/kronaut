import type { ProviderManifest } from '@kronaut/core';
import {
  DISCORD_MESSAGE,
  type DiscordMessageSettings,
  discordMessageSettings,
} from '../_kit/discord/message-spec.ts';

export const discordBotManifest: ProviderManifest<DiscordMessageSettings> = {
  id: 'discord_bot',
  apiVersion: { version: 'v10' },
  availability: { state: 'experimental' },
  auth: { kind: 'bot_token', refresh: 'none', warnLeadMs: 0, connectPicker: 'kronaut' },
  postTypes: [DISCORD_MESSAGE],
  settings: discordMessageSettings,
  cost: { model: 'free' },
  verify: { mode: 'list_recent_match', windowMs: 60 * 60 * 1000 },
  rateLimits: [],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['discord.com'],
};
