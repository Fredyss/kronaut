import type { ProviderRuntime } from '@kronaut/core';
import { blueskyRuntime } from './bluesky/runtime.ts';
import { facebookRuntime } from './facebook/runtime.ts';
import { instagramRuntime } from './instagram/runtime.ts';
import { linkedinRuntime } from './linkedin/runtime.ts';
import { mastodonRuntime } from './mastodon/runtime.ts';
import { threadsRuntime } from './threads/runtime.ts';

export const runtimes: readonly ProviderRuntime[] = [
  blueskyRuntime,
  facebookRuntime,
  instagramRuntime,
  linkedinRuntime,
  mastodonRuntime,
  threadsRuntime,
];
