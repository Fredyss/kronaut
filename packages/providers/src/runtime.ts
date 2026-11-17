import type { ProviderRuntime } from '@kronaut/core';
import { blueskyRuntime } from './bluesky/runtime.ts';
import { discordRuntime } from './discord/runtime.ts';
import { discordBotRuntime } from './discord-bot/runtime.ts';
import { facebookRuntime } from './facebook/runtime.ts';
import { instagramRuntime } from './instagram/runtime.ts';
import { linkedinRuntime } from './linkedin/runtime.ts';
import { mastodonRuntime } from './mastodon/runtime.ts';
import { pinterestRuntime } from './pinterest/runtime.ts';
import { threadsRuntime } from './threads/runtime.ts';
import { youtubeRuntime } from './youtube/runtime.ts';

export const runtimes: readonly ProviderRuntime[] = [
  blueskyRuntime,
  discordRuntime,
  discordBotRuntime,
  facebookRuntime,
  instagramRuntime,
  linkedinRuntime,
  mastodonRuntime,
  pinterestRuntime,
  threadsRuntime,
  youtubeRuntime,
];
