import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';

export const linkedinSettings = z.object({});
export type LinkedinSettings = z.infer<typeof linkedinSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MEMBER_POSTS_PER_DAY = 150;

export const linkedinManifest: ProviderManifest<LinkedinSettings> = {
  id: 'linkedin',
  apiVersion: { version: '202610', sunsetOn: '2027-10-15' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'none', accessTtlMs: 60 * DAY_MS, warnLeadMs: 7 * DAY_MS },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload_images', effect: 'private' },
        { id: 'create_post', effect: 'public' },
      ],
      text: [{ counting: 'utf16', max: 3_000 }],
      media: {
        minCount: 0,
        maxCount: 20,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 8_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 4_086 },
        aiLabel: false,
      },
    },
  ],
  settings: linkedinSettings,
  cost: { model: 'free' },
  verify: { mode: 'none', windowMs: 0 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'member_posts_day',
      capacity: MEMBER_POSTS_PER_DAY,
      refillPerHour: MEMBER_POSTS_PER_DAY / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'pro-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['www.linkedin.com', 'api.linkedin.com'],
};
