import type { ProviderManifest, ProviderRuntime } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { conformanceProblems } from './conformance.ts';

const MANIFEST: ProviderManifest = {
  id: 'example',
  apiVersion: { version: '1' },
  availability: { state: 'experimental' },
  auth: { kind: 'oauth', refresh: 'rotating', warnLeadMs: 0 },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload', effect: 'private' },
        { id: 'create', effect: 'public' },
      ],
      text: [{ counting: 'graphemes', max: 10 }],
      media: {
        minCount: 0,
        maxCount: 1,
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: false,
      },
    },
  ],
  settings: z.object({ lang: z.string().default('en') }),
  cost: { model: 'free' },
  verify: { mode: 'deterministic_id', windowMs: 60_000 },
  rateLimits: [],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['api.example.test'],
};

const unused = () => Promise.reject(new Error('unused'));

const RUNTIME: ProviderRuntime = {
  id: 'example',
  parseCredentials: (value) => value,
  connectStart: unused,
  connectFinish: unused,
  refresh: unused,
  publish: unused,
  verify: unused,
};

describe('conformanceProblems', () => {
  it('accepts a consistent provider', () => {
    expect(conformanceProblems(MANIFEST, RUNTIME)).toEqual([]);
    const weekly = { ...MANIFEST, analytics: { pullHours: [24, 168, 696], followersEveryDays: 7 } };
    expect(conformanceProblems(weekly, RUNTIME)).toEqual([]);
  });

  it('refuses a pull schedule that is empty, too long or not above 0', () => {
    for (const pullHours of [[], [1, 2, 3, 4, 5, 6, 7], [0, 6], [1.5]]) {
      expect(conformanceProblems({ ...MANIFEST, analytics: { pullHours } }, RUNTIME)).toEqual([
        'analytics pull hours must be 1–6 whole hours, rising from above 0',
      ]);
    }
  });

  it('reports every inconsistency', () => {
    const { refresh: _refresh, verify: _verify, ...bare } = RUNTIME;
    const [type] = MANIFEST.postTypes;
    if (type === undefined) throw new Error('fixture');
    const manifest: ProviderManifest = {
      ...MANIFEST,
      auth: { ...MANIFEST.auth, instanceScoped: true, connectPicker: 'kronaut' },
      egressHosts: [],
      postTypes: [
        {
          ...type,
          steps: [
            { id: 'a', effect: 'private' },
            { id: 'a', effect: 'private' },
          ],
          text: [],
          media: { ...type.media, minCount: 2 },
          analytics: { windowHours: 1 },
        },
      ],
      settings: z.object({ lang: z.string() }),
      dataRetention: { disconnectedDays: 0, lapsedDays: 30 },
      analytics: { pullHours: [24, 24], followersEveryDays: 0.5 },
    };
    expect(conformanceProblems(manifest, { ...bare, id: 'other' })).toEqual([
      'runtime id other ≠ example',
      'no egress hosts',
      'post: duplicate step ids',
      'post: no public step',
      'post: no text limit',
      'post: media min > max',
      'post: analytics window must cover the first pull at 24 h',
      'refresh rotating without runtime.refresh',
      'instanceScoped without runtime.registerApp',
      'a Kronaut picker needs accounts without refreshable secrets',
      'verify deterministic_id without runtime.verify',
      'analytics pull hours must be 1–6 whole hours, rising from above 0',
      'analytics follower cadence must be whole days, at least 1',
      'settings reject {}',
      'data retention days must be whole and at least 1',
    ]);
  });
});
