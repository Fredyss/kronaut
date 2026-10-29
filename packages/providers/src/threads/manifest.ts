import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { REPLY_THREAD } from '../_kit/items.ts';
import { accountPostType } from './capabilities.ts';

export const threadsSettings = z.object({});
export type ThreadsSettings = z.infer<typeof threadsSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const POSTS_PER_DAY = 250;
const STEPS = [
  { id: 'create_container', effect: 'private' },
  { id: 'publish_container', effect: 'public' },
] as const;
const TEXT = [{ counting: 'threads', max: 500 }] as const;
const ASYNC = { pollIntervalMs: 60_000, giveUpAfterMs: 5 * 60_000 } as const;

export const threadsManifest: ProviderManifest<ThreadsSettings> = {
  id: 'threads',
  apiVersion: { version: 'v1.0' },
  availability: { state: 'experimental' },
  auth: {
    kind: 'oauth',
    refresh: 'self_refresh',
    accessTtlMs: 60 * DAY_MS,
    warnLeadMs: 7 * DAY_MS,
  },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: STEPS,
      text: TEXT,
      maxLinks: 5,
      media: {
        minCount: 0,
        maxCount: 20,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 8_000_000 },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: false,
      },
      async: ASYNC,
      thread: REPLY_THREAD,
    },
    {
      id: 'video',
      delivery: 'api',
      steps: STEPS,
      text: TEXT,
      maxLinks: 5,
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 1_000_000_000,
          minDurationMs: 1,
          maxDurationMs: 300_000,
          minAspect: { width: 1, height: 100 },
          maxAspect: { width: 10, height: 1 },
        },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 1000 },
        aiLabel: false,
      },
      async: ASYNC,
      thread: REPLY_THREAD,
    },
  ],
  settings: threadsSettings,
  cost: { model: 'free' },
  verify: { mode: 'status_by_ref', windowMs: 10 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'publishes_day',
      capacity: POSTS_PER_DAY,
      refillPerHour: POSTS_PER_DAY / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: true, delete: false },
  egressHosts: ['threads.com', 'graph.threads.com'],
  accountPostType,
};
