import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import { boardOptions } from './boards.ts';

const TITLE_MAX = 100;
const LINK_MAX = 2048;
const BOARD_ID = /^\d{1,32}$/;

function isHttps(value: string): boolean {
  return URL.canParse(value) && new URL(value).protocol === 'https:';
}

const pinterestSettings = z.object({
  boardId: z.string().regex(BOARD_ID).optional(),
  title: z
    .string()
    .transform((title) => title.normalize('NFC'))
    .pipe(z.string().max(TITLE_MAX))
    .optional(),
  link: z.string().max(LINK_MAX).refine(isHttps).optional(),
});
export type PinterestSettings = z.infer<typeof pinterestSettings>;

const DAY_MS = 24 * 60 * 60 * 1000;
const WRITES_PER_MINUTE = 100;

export const pinterestManifest: ProviderManifest<PinterestSettings> = {
  id: 'pinterest',
  apiVersion: { version: 'v5' },
  availability: { state: 'experimental', caveatKey: 'pinterest_trial_and_manual_pins' },
  auth: {
    kind: 'oauth',
    refresh: 'rotating',
    accessTtlMs: 30 * DAY_MS,
    refreshTtlMs: 60 * DAY_MS,
    warnLeadMs: DAY_MS,
  },
  postTypes: [
    {
      id: 'pin',
      delivery: 'api',
      steps: [{ id: 'create', effect: 'public' }],
      text: [{ counting: 'utf16', max: 800 }],
      media: {
        minCount: 1,
        maxCount: 1,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 20_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 500 },
        aiLabel: false,
      },
    },
  ],
  settings: pinterestSettings,
  requiredSettings: ['boardId'],
  cost: { model: 'free' },
  verify: { mode: 'list_recent_match', windowMs: 60 * 60 * 1000 },
  rateLimits: [
    {
      scope: 'account',
      bucket: 'org_write_minute',
      capacity: WRITES_PER_MINUTE,
      refillPerHour: WRITES_PER_MINUTE * 60,
      costPerPost: 1,
    },
  ],
  concurrency: 1,
  preview: 'media-grid',
  capabilities: { analytics: false, delete: false },
  dataRetention: { disconnectedDays: 7, lapsedDays: 30 },
  egressHosts: ['api.pinterest.com'],
  accountSettingOptions: boardOptions,
};
