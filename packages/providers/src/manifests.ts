import type { ProviderManifest } from '@kronaut/core';
import { blueskyManifest } from './bluesky/manifest.ts';
import { facebookManifest } from './facebook/manifest.ts';
import { instagramManifest } from './instagram/manifest.ts';
import { linkedinManifest } from './linkedin/manifest.ts';
import { mastodonManifest } from './mastodon/manifest.ts';
import { threadsManifest } from './threads/manifest.ts';

export const manifests: readonly ProviderManifest[] = [
  blueskyManifest,
  facebookManifest,
  instagramManifest,
  linkedinManifest,
  mastodonManifest,
  threadsManifest,
];
