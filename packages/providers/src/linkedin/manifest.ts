import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';

export const linkedinSettings = z.object({});
export type LinkedinSettings = z.infer<typeof linkedinSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MEMBER_POSTS_PER_DAY = 150;

const POST_TEXT = [{ counting: 'utf16', max: 3_000 }] as const;
const ALT_TEXT = { supported: true, required: false, maxLength: 4_086 } as const;

export const videoAsync = { pollIntervalMs: 30_000, giveUpAfterMs: 30 * 60_000 } as const;

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
      text: POST_TEXT,
      media: {
        minCount: 0,
        maxCount: 20,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 8_000_000 },
        mixed: false,
        altText: ALT_TEXT,
        aiLabel: false,
      },
    },
    {
      id: 'video',
      delivery: 'api',
      steps: [
        { id: 'upload_video', effect: 'private' },
        { id: 'create_post', effect: 'public' },
      ],
      text: POST_TEXT,
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 500_000_000,
          minDurationMs: 3_000,
          maxDurationMs: 1_800_000,
        },
        mixed: false,
        altText: ALT_TEXT,
        aiLabel: false,
      },
      async: videoAsync,
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
