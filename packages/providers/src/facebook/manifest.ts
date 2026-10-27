import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';

export const facebookSettings = z.object({});
export type FacebookSettings = z.infer<typeof facebookSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_CALLS_PER_DAY = 4_800;

export const facebookManifest: ProviderManifest<FacebookSettings> = {
  id: 'facebook',
  apiVersion: { version: 'v26.0' },
  availability: { state: 'experimental' },
  auth: { kind: 'page_token', refresh: 'none', warnLeadMs: 7 * DAY_MS },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload_photos', effect: 'private' },
        { id: 'create_post', effect: 'public' },
      ],
      text: [{ counting: 'utf16', max: 63_206 }],
      media: {
        minCount: 0,
        maxCount: 10,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 10_000_000 },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: false,
      },
    },
  ],
  settings: facebookSettings,
  cost: { model: 'free' },
  verify: { mode: 'list_recent_match', windowMs: 60 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'page_calls_day',
      capacity: PAGE_CALLS_PER_DAY,
      refillPerHour: PAGE_CALLS_PER_DAY / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'pro-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['www.facebook.com', 'graph.facebook.com'],
};
