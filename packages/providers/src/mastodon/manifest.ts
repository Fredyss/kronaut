import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { accountPostType } from './limits.ts';

export const mastodonSettings = z.object({});
export type MastodonSettings = z.infer<typeof mastodonSettings>;

const FIVE_MINUTES_PER_HOUR = 12;

export const mastodonManifest: ProviderManifest<MastodonSettings> = {
  id: 'mastodon',
  apiVersion: { version: '2026-10-26' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'none', instanceScoped: true, warnLeadMs: 0 },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload_media', effect: 'private' },
        { id: 'create_status', effect: 'public' },
      ],
      text: [{ counting: 'mastodon', max: 500, urlWeight: 23 }],
      media: {
        minCount: 0,
        maxCount: 4,
        image: {
          mimes: [
            'image/png',
            'image/jpeg',
            'image/heic',
            'image/heif',
            'image/webp',
            'image/avif',
          ],
          maxBytes: 16_777_216,
        },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 1_500 },
        aiLabel: false,
      },
      async: { pollIntervalMs: 5_000, giveUpAfterMs: 15 * 60 * 1000 },
    },
  ],
  settings: mastodonSettings,
  cost: { model: 'free' },
  verify: { mode: 'list_recent_match', windowMs: 60 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'api_calls',
      capacity: 300,
      refillPerHour: 300 * FIVE_MINUTES_PER_HOUR,
      costPerPost: 10,
    },
    {
      scope: 'instance',
      bucket: 'ip_calls',
      capacity: 300,
      refillPerHour: 300 * FIVE_MINUTES_PER_HOUR,
      costPerPost: 10,
    },
    {
      scope: 'account',
      bucket: 'media_uploads',
      capacity: 30,
      refillPerHour: 60,
      costPerPost: 4,
    },
  ],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['*'],
  accountPostType,
};
