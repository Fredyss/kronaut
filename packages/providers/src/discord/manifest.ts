import type { ProviderManifest } from '@kronaut/core';
import {
  DISCORD_MESSAGE,
  type DiscordMessageSettings,
  discordMessageSettings,
} from '../_kit/discord/message-spec.ts';

export const discordManifest: ProviderManifest<DiscordMessageSettings> = {
  id: 'discord',
  apiVersion: { version: 'v10' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'none', warnLeadMs: 0 },
  postTypes: [DISCORD_MESSAGE],
  settings: discordMessageSettings,
  cost: { model: 'free' },
  verify: { mode: 'none', windowMs: 0 },
  rateLimits: [],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: true, delete: false },
  egressHosts: ['discord.com'],
};
