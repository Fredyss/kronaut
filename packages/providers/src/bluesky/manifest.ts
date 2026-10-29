import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { REPLY_THREAD } from '../_kit/items.ts';

export const blueskySettings = z.object({});
export type BlueskySettings = z.infer<typeof blueskySettings>;

export const blueskyManifest: ProviderManifest<BlueskySettings> = {
  id: 'bluesky',
  apiVersion: { version: '2026-10-23' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'rotating', warnLeadMs: 24 * 60 * 60 * 1000 },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload_blobs', effect: 'private' },
        { id: 'create_record', effect: 'public' },
      ],
      text: [
        { counting: 'graphemes', max: 300 },
        { counting: 'utf8-bytes', max: 3_000 },
      ],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 2_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 2_000 },
        aiLabel: false,
      },
      thread: REPLY_THREAD,
    },
  ],
  settings: blueskySettings,
  cost: { model: 'free' },
  verify: { mode: 'deterministic_id', windowMs: 10 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'writes_hour',
      capacity: 5_000,
      refillPerHour: 5_000,
      costPerPost: 3,
    },
    {
      scope: 'account',
      bucket: 'writes_day',
      capacity: 35_000,
      refillPerHour: 35_000 / 24,
      costPerPost: 3,
    },
    {
      scope: 'instance',
      bucket: 'pds_requests',
      capacity: 3_000,
      refillPerHour: 36_000,
      costPerPost: 5,
    },
  ],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: true, delete: false },
  egressHosts: ['*'],
};
