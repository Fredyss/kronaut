import type { ProviderManifest } from '@kronaut/core';
import { blueskyManifest } from './bluesky/manifest.ts';
import { discordManifest } from './discord/manifest.ts';
import { discordBotManifest } from './discord-bot/manifest.ts';
import { facebookManifest } from './facebook/manifest.ts';
import { instagramManifest } from './instagram/manifest.ts';
import { linkedinManifest } from './linkedin/manifest.ts';
import { mastodonManifest } from './mastodon/manifest.ts';
import { pinterestManifest } from './pinterest/manifest.ts';
import { threadsManifest } from './threads/manifest.ts';
import { xManifest } from './x-com/manifest.ts';
import { youtubeManifest } from './youtube/manifest.ts';

export const manifests: readonly ProviderManifest[] = [
  blueskyManifest,
  discordManifest,
  discordBotManifest,
  facebookManifest,
  instagramManifest,
  linkedinManifest,
  mastodonManifest,
  pinterestManifest,
  threadsManifest,
  xManifest,
  youtubeManifest,
];
