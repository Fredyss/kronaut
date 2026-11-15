import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';

const FORBIDDEN = /[<>]/;

const youtubeSettings = z.object({
  title: z
    .string()
    .transform((title) => title.normalize('NFC'))
    .pipe(
      z
        .string()
        .max(100)
        .refine((title) => !FORBIDDEN.test(title)),
    )
    .optional(),
  privacy: z.enum(['public', 'unlisted', 'private']).default('public'),
  madeForKids: z.boolean().optional(),
});
export type YoutubeSettings = z.infer<typeof youtubeSettings>;

const HOUR_MS = 60 * 60 * 1000;
const UPLOADS_PER_DAY = 100;

export const youtubeManifest: ProviderManifest<YoutubeSettings> = {
  id: 'youtube',
  apiVersion: { version: 'v3' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'reusable', accessTtlMs: HOUR_MS, warnLeadMs: HOUR_MS / 4 },
  postTypes: [
    {
      id: 'video',
      delivery: 'api',
      steps: [{ id: 'upload_video', effect: 'public' }],
      text: [{ counting: 'utf8-bytes', max: 5_000 }],
      forbiddenChars: '<>',
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 256_000_000_000,
          minDurationMs: 3_000,
          maxDurationMs: 900_000,
        },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: true,
      },
    },
  ],
  settings: youtubeSettings,
  requiredSettings: ['title'],
  cost: { model: 'free' },
  verify: { mode: 'status_by_ref', windowMs: 6 * HOUR_MS },
  rateLimits: [
    {
      scope: 'app',
      bucket: 'videos_insert_day',
      capacity: UPLOADS_PER_DAY,
      refillPerHour: UPLOADS_PER_DAY / 24,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'pro-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['accounts.google.com', 'oauth2.googleapis.com', 'www.googleapis.com'],
};
