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
  });

  it('reports every inconsistency', () => {
    const { refresh: _refresh, verify: _verify, ...bare } = RUNTIME;
    const [type] = MANIFEST.postTypes;
    if (type === undefined) throw new Error('fixture');
    const manifest: ProviderManifest = {
      ...MANIFEST,
      auth: { ...MANIFEST.auth, instanceScoped: true },
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
        },
      ],
      settings: z.object({ lang: z.string() }),
    };
    expect(conformanceProblems(manifest, { ...bare, id: 'other' })).toEqual([
      'runtime id other ≠ example',
      'no egress hosts',
      'post: duplicate step ids',
      'post: no public step',
      'post: no text limit',
      'post: media min > max',
      'refresh rotating without runtime.refresh',
      'instanceScoped without runtime.registerApp',
      'verify deterministic_id without runtime.verify',
      'settings reject {}',
    ]);
  });
});
