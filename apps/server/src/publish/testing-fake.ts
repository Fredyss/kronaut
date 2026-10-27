import type {
  Account,
  ClientSigningKey,
  IssuedCredentials,
  ProviderError,
  ProviderManifest,
  ProviderRuntime,
  ProviderState,
  PublishOutcome,
  RefreshKind,
  VerifyMode,
  VerifyOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import {
  type FakeQueues,
  fakePoll,
  fakePublish,
  fakeRefresh,
  fakeVerify,
} from './testing-fake-runtime.ts';

export const FAKE_PROVIDER = 'fake';
export const FAKE_TEXT_MAX = 300;

export type FakeHook = () => Promise<void>;

export type FakeBehaviour =
  | {
      readonly kind: 'publish';
      readonly remoteId?: string;
      readonly url?: string;
      readonly checkpoint?: ProviderState;
      readonly beforePublic?: FakeHook;
      readonly afterPublic?: FakeHook;
    }
  | {
      readonly kind: 'pending';
      readonly pollAfterMs: number;
      readonly checkpoint?: ProviderState;
      readonly afterPublic?: boolean;
    }
  | {
      readonly kind: 'fail';
      readonly error: ProviderError;
      readonly at: 'before_public' | 'after_public';
      readonly beforePublic?: FakeHook;
      readonly afterPublic?: FakeHook;
    }
  | { readonly kind: 'crash_after_public' };

export type FakeVerify =
  | (VerifyOutcome & { readonly during?: FakeHook })
  | { readonly kind: 'throw'; readonly error?: ProviderError }
  | { readonly kind: 'public_step' };

export type FakePoll = PublishOutcome;

export interface FakeVerifyConfig {
  readonly mode: VerifyMode;
  readonly windowMs: number;
  readonly poll: boolean;
}

export interface FakeAuthConfig {
  readonly refresh: RefreshKind;
  readonly warnLeadMs: number;
}

export type FakeRefresh = (
  | { readonly kind: 'issue'; readonly issued: IssuedCredentials<unknown> }
  | { readonly kind: 'fail'; readonly error: ProviderError }
  | { readonly kind: 'throw' }
) & { readonly during?: FakeHook };

export interface FakeRefreshCall {
  readonly account: Account;
  readonly credentials: unknown;
  readonly signingKey?: ClientSigningKey;
}

export interface FakeCall {
  readonly attemptNo: number;
  readonly state: ProviderState;
  readonly credentials: unknown;
  readonly events: string[];
}

export interface FakeProvider {
  readonly manifest: ProviderManifest;
  readonly runtime: ProviderRuntime;
  readonly calls: readonly FakeCall[];
  readonly checks: readonly FakeCall[];
  readonly refreshes: readonly FakeRefreshCall[];
  script(...behaviours: FakeBehaviour[]): void;
  scriptVerify(...behaviours: FakeVerify[]): void;
  scriptPoll(...behaviours: FakePoll[]): void;
  configure(config: FakeVerifyConfig): void;
  scriptRefresh(...behaviours: FakeRefresh[]): void;
  configureAuth(config: FakeAuthConfig): void;
}

export const fakeManifest: ProviderManifest = {
  id: FAKE_PROVIDER,
  apiVersion: { version: '1' },
  availability: { state: 'stable' },
  auth: { kind: 'oauth', refresh: 'none', warnLeadMs: 0 },
  postTypes: [
    {
      id: 'post',
      delivery: 'api',
      steps: [
        { id: 'upload', effect: 'none' },
        { id: 'publish', effect: 'public' },
      ],
      text: [{ counting: 'graphemes', max: FAKE_TEXT_MAX }],
      media: {
        minCount: 0,
        maxCount: 4,
        image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 1_000_000 },
        mixed: false,
        altText: { supported: true, required: false, maxLength: 1000 },
        aiLabel: false,
      },
      async: { pollIntervalMs: 1000, giveUpAfterMs: 3_600_000 },
    },
  ],
  settings: z.object({}),
  cost: { model: 'free' },
  verify: { mode: 'none', windowMs: 0 },
  rateLimits: [],
  concurrency: 1,
  preview: 'short-feed',
  capabilities: { analytics: false, delete: false },
  egressHosts: ['fake.example.test'],
};

export const fakeVerifyDefaults: FakeVerifyConfig = {
  mode: fakeManifest.verify.mode,
  windowMs: fakeManifest.verify.windowMs,
  poll: false,
};

export function fakeProvider(): FakeProvider {
  const q: FakeQueues = {
    calls: [],
    checks: [],
    queue: [],
    verifyQueue: [],
    pollQueue: [],
    refreshes: [],
    refreshQueue: [],
  };
  let config = fakeVerifyDefaults;
  let auth: FakeAuthConfig = fakeManifest.auth;
  const manifest: ProviderManifest = {
    ...fakeManifest,
    get auth() {
      return { kind: fakeManifest.auth.kind, refresh: auth.refresh, warnLeadMs: auth.warnLeadMs };
    },
    get verify() {
      return { mode: config.mode, windowMs: config.windowMs };
    },
  };
  const poll = fakePoll(q);
  const refresh = fakeRefresh(q);
  const runtime: ProviderRuntime = {
    id: FAKE_PROVIDER,
    parseCredentials: (value) => value,
    connectStart: () => Promise.reject(new Error('fake provider cannot connect')),
    connectFinish: () => Promise.reject(new Error('fake provider cannot connect')),
    publish: (ctx, input) => fakePublish(q, ctx, input),
    verify: (ctx, input) => fakeVerify(q, ctx, input),
  };
  return {
    manifest,
    runtime,
    calls: q.calls,
    checks: q.checks,
    refreshes: q.refreshes,
    script: (...behaviours) => {
      q.queue.push(...behaviours);
    },
    scriptVerify: (...behaviours) => {
      q.verifyQueue.push(...behaviours);
    },
    scriptPoll: (...behaviours) => {
      q.pollQueue.push(...behaviours);
    },
    configure: (next) => {
      config = next;
      if (next.poll) runtime.poll = poll;
      else delete runtime.poll;
    },
    scriptRefresh: (...behaviours) => {
      q.refreshQueue.push(...behaviours);
    },
    configureAuth: (next) => {
      auth = next;
      if (next.refresh === 'none') delete runtime.refresh;
      else runtime.refresh = refresh;
    },
  };
}
