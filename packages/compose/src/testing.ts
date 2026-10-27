import type { ProviderManifest } from '@kronaut/core';
import * as z from 'zod';
import type { DraftItem, DraftMedia, IssueCode } from './validate.ts';

const BASE = {
  apiVersion: { version: 'test' },
  availability: { state: 'stable' },
  auth: { kind: 'oauth', refresh: 'none', warnLeadMs: 0 },
  settings: z.object({}),
  cost: { model: 'free' },
  verify: { mode: 'none', windowMs: 0 },
  rateLimits: [],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: [],
} satisfies Omit<ProviderManifest, 'id' | 'postTypes'>;

const STEPS = [{ id: 'create', effect: 'public' }] as const;

export const SKY = {
  ...BASE,
  id: 'sky',
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: STEPS,
      text: [
        { counting: 'graphemes', max: 300 },
        { counting: 'utf8-bytes', max: 3000 },
      ],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 1_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 2000 },
        aiLabel: false,
      },
    },
    {
      id: 'gallery',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'graphemes', max: 300 }],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg'], maxBytes: 1_000_000 },
        video: {
          mimes: ['video/mp4'],
          maxBytes: 50_000_000,
          minDurationMs: 1000,
          maxDurationMs: 180_000,
        },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 2000 },
        aiLabel: false,
      },
    },
    {
      id: 'strict_alt',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'graphemes', max: 300 }],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg'], maxBytes: 1_000_000 },
        mixed: false,
        altText: { supported: true, required: true, maxLength: 2000 },
        aiLabel: false,
      },
    },
    {
      id: 'remind',
      delivery: 'reminder',
      steps: [{ id: 'remind', effect: 'none' }],
      text: [{ counting: 'utf16', max: 10 }],
      media: {
        minCount: 0,
        maxCount: 0,
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: false,
      },
    },
    {
      id: 'retired',
      delivery: 'unsupported',
      steps: [],
      text: [],
      media: {
        minCount: 0,
        maxCount: 0,
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: false,
      },
    },
  ],
} satisfies ProviderManifest;

export const GRAM = {
  ...BASE,
  id: 'gram',
  postTypes: [
    {
      id: 'carousel',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'utf16', max: 2200 }],
      media: {
        minCount: 2,
        maxCount: 10,
        image: {
          mimes: ['image/jpeg'],
          maxBytes: 8_000_000,
          minWidth: 320,
          maxWidth: 1440,
          minAspect: { width: 4, height: 5 },
          maxAspect: { width: 191, height: 100 },
        },
        video: {
          mimes: ['video/mp4'],
          maxBytes: 100_000_000,
          minDurationMs: 3000,
          maxDurationMs: 60_000,
          minAspect: { width: 4, height: 5 },
          maxAspect: { width: 191, height: 100 },
        },
        mixed: true,
        altText: { supported: true, required: false, maxLength: 1000 },
        aiLabel: true,
      },
    },
    {
      id: 'reel',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'utf16', max: 2200 }],
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 1_000_000_000,
          minDurationMs: 3000,
          maxDurationMs: 90_000,
          minAspect: { width: 9, height: 16 },
          maxAspect: { width: 9, height: 16 },
        },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: true,
      },
    },
    {
      id: 'wide_only',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'utf16', max: 100 }],
      media: {
        minCount: 0,
        maxCount: 1,
        image: { mimes: ['image/jpeg'], maxBytes: 1_000_000, maxAspect: { width: 2, height: 1 } },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 100 },
        aiLabel: false,
      },
    },
    {
      id: 'tall_only',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'utf16', max: 100 }],
      media: {
        minCount: 0,
        maxCount: 1,
        image: { mimes: ['image/jpeg'], maxBytes: 1_000_000, minAspect: { width: 1, height: 2 } },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 100 },
        aiLabel: false,
      },
    },
    {
      id: 'wide_px',
      delivery: 'api',
      steps: STEPS,
      text: [{ counting: 'utf16', max: 100 }],
      media: {
        minCount: 0,
        maxCount: 1,
        image: { mimes: ['image/jpeg'], maxBytes: 1_000_000, minWidth: 100 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 100 },
        aiLabel: false,
      },
    },
  ],
} satisfies ProviderManifest;

export const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}';

export function jpeg(overrides: Partial<DraftMedia> = {}): DraftMedia {
  return {
    kind: 'image',
    mime: 'image/jpeg',
    bytes: 100_000,
    width: 1080,
    height: 1350,
    ...overrides,
  };
}

export function mp4(overrides: Partial<DraftMedia> = {}): DraftMedia {
  return {
    kind: 'video',
    mime: 'video/mp4',
    bytes: 1_000_000,
    width: 1080,
    height: 1350,
    durationMs: 10_000,
    ...overrides,
  };
}

export function main(text = 'hello', media: readonly DraftMedia[] = []): DraftItem {
  return { role: 'main', text, media };
}

export function thread(text = 'more', media: readonly DraftMedia[] = []): DraftItem {
  return { role: 'thread', text, media };
}

export function comment(text = 'first', media: readonly DraftMedia[] = []): DraftItem {
  return { role: 'comment', text, media };
}

export function codes(issues: readonly { code: IssueCode }[]): IssueCode[] {
  return issues.map((issue) => issue.code);
}
