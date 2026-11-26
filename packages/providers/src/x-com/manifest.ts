import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { REPLY_THREAD } from '../_kit/items.ts';

const xSettings = z.object({});
export type XSettings = z.infer<typeof xSettings>;

const HOUR_MS = 60 * 60 * 1000;
const POSTS_PER_15_MIN = 100;
const POSTS_PER_DAY_PER_APP = 10_000;

const videoPolling = { pollIntervalMs: 10_000, giveUpAfterMs: 30 * 60_000 };

export const xManifest: ProviderManifest<XSettings> = {
  id: 'x_com',
  apiVersion: { version: '2' },
  availability: { state: 'experimental' },
  auth: {
    kind: 'oauth',
    refresh: 'rotating',
    accessTtlMs: 2 * HOUR_MS,
    warnLeadMs: 24 * HOUR_MS,
  },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload_media', effect: 'private' },
        { id: 'create_post', effect: 'public' },
      ],
      text: [{ counting: 'x-weighted', max: 280 }],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5_000_000 },
        video: {
          mimes: ['video/mp4'],
          maxBytes: 8_000_000_000,
          minDurationMs: 500,
          maxDurationMs: 20 * 60_000,
          minAspect: { width: 1, height: 3 },
          maxAspect: { width: 3, height: 1 },
          maxFrameRate: 60,
        },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 1_000 },
        aiLabel: false,
      },
      async: videoPolling,
      thread: REPLY_THREAD,
    },
  ],
  settings: xSettings,
  cost: {
    model: 'per_post',
    perPost: {
      usdMicros: 15_000,
      linkUsdMicros: 200_000,
      asOf: '2026-11-23',
      sourceUrl: 'https://docs.x.com/x-api/getting-started/pricing',
    },
  },
  verify: { mode: 'list_recent_match', windowMs: HOUR_MS },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'posts_15min',
      capacity: POSTS_PER_15_MIN,
      refillPerHour: POSTS_PER_15_MIN * 4,
      costPerPost: 1,
    },
    {
      scope: 'app',
      bucket: 'posts_day',
      capacity: POSTS_PER_DAY_PER_APP,
      refillPerHour: POSTS_PER_DAY_PER_APP / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: true, delete: false },
  analytics: { pullHours: [24, 168, 696], followersEveryDays: 7, purgeOnMissing: true },
  dataRetention: { disconnectedDays: 7, lapsedDays: 30 },
  egressHosts: ['api.x.com'],
  noRepeats: true,
  warnDuplicateText: true,
  workspaceApps: true,
};
