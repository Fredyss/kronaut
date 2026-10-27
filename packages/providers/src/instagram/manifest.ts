import type { MediaLimits, ProviderManifest, TextLimit } from '@kronaut/core';
import * as z from 'zod';

export const instagramSettings = z.object({});
export type InstagramSettings = z.infer<typeof instagramSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;

const caption: readonly TextLimit[] = [{ counting: 'utf16', max: 2_200 }];

function jpegs(minCount: number, maxCount: number): MediaLimits {
  return {
    minCount,
    maxCount,
    image: {
      mimes: ['image/jpeg'],
      maxBytes: 8_000_000,
      minAspect: { width: 4, height: 5 },
      maxAspect: { width: 191, height: 100 },
    },
    mixed: false,
    altText: { supported: true, required: false, maxLength: 1_000 },
    aiLabel: true,
  };
}

const containerPolling = { pollIntervalMs: 60_000, giveUpAfterMs: 5 * 60_000 };

export const instagramManifest: ProviderManifest<InstagramSettings> = {
  id: 'instagram',
  apiVersion: { version: 'v26.0' },
  availability: { state: 'experimental' },
  auth: {
    kind: 'oauth',
    refresh: 'self_refresh',
    accessTtlMs: 60 * DAY_MS,
    warnLeadMs: 7 * DAY_MS,
  },
  postTypes: [
    {
      id: 'image',
      delivery: 'api',
      steps: [
        { id: 'create_container', effect: 'private' },
        { id: 'publish_container', effect: 'public' },
      ],
      text: caption,
      media: jpegs(1, 1),
      async: containerPolling,
    },
    {
      id: 'carousel',
      delivery: 'api',
      steps: [
        { id: 'create_children', effect: 'private' },
        { id: 'create_container', effect: 'private' },
        { id: 'publish_container', effect: 'public' },
      ],
      text: caption,
      media: jpegs(2, 20),
      async: containerPolling,
    },
  ],
  settings: instagramSettings,
  cost: { model: 'free' },
  verify: { mode: 'status_by_ref', windowMs: 10 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'publishes_day',
      capacity: 50,
      refillPerHour: 50 / 24,
      costPerPost: 1,
    },
    {
      scope: 'account',
      bucket: 'containers_day',
      capacity: 400,
      refillPerHour: 400 / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'media-grid',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['api.instagram.com', 'graph.instagram.com'],
};
