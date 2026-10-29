import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { commentPostType, firstComment } from '../_kit/meta-comment.ts';

export const facebookSettings = z.object({});
export type FacebookSettings = z.infer<typeof facebookSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_CALLS_PER_DAY = 4_800;
const POST_TEXT = [{ counting: 'utf16', max: 63_206 }] as const;
const comment = firstComment(POST_TEXT);

export const reelPolling = { pollIntervalMs: 30_000, giveUpAfterMs: 20 * 60_000 };

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
      text: POST_TEXT,
      media: {
        minCount: 0,
        maxCount: 10,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 10_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 1_000 },
        aiLabel: false,
      },
      comment,
    },
    {
      id: 'reel',
      delivery: 'api',
      steps: [
        { id: 'upload_video', effect: 'private' },
        { id: 'publish_reel', effect: 'public' },
      ],
      text: POST_TEXT,
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 300_000_000,
          minDurationMs: 3_000,
          maxDurationMs: 90_000,
          minAspect: { width: 9, height: 16 },
          maxAspect: { width: 9, height: 16 },
          maxFrameRate: 60,
        },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: true,
      },
      async: reelPolling,
      comment,
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
  capabilities: { analytics: true, delete: false },
  egressHosts: ['www.facebook.com', 'graph.facebook.com', 'rupload.facebook.com'],
  accountPostType: commentPostType,
};
