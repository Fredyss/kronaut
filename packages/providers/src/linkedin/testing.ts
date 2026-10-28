import {
  isProviderFailure,
  type MediaRef,
  type ProviderState,
  type PublishInput,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import {
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  type TestMedia,
  testPublishContext,
} from '../_kit/testing.ts';
import type { LinkedinSettings } from './manifest.ts';
import { type LinkedinCredentials, linkedinRuntime } from './runtime.ts';

export const SUB = 'aB3_x-9Q';
export const AUTHOR = `urn:li:person:${SUB}`;
export const TOKEN = 'linkedin-member-canary-3f9a';
export const POSTS = 'https://api.linkedin.com/rest/posts';
export const SHARE = 'urn:li:share:7123456789012345678';
export const SENT_AT = '2026-10-21T12:00:00.000Z';
export const REST_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Linkedin-Version': '202610',
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
};

export const ref = (id: string, extra: Partial<MediaRef> = {}): MediaRef => ({
  id,
  sha256: 'a'.repeat(64),
  mime: 'image/png',
  bytes: 3,
  aiGenerated: false,
  ...extra,
});

export const defaultMedia: Readonly<Record<string, TestMedia>> = {
  m1: { url: 'https://media.example.org/m1', bytes: new Uint8Array([1, 2, 3]) },
  m2: { url: 'https://media.example.org/m2', bytes: new Uint8Array([4]) },
  m3: { url: 'https://media.example.org/m3', bytes: new Uint8Array([5]) },
};

export function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

export function input(
  item: PublishItem,
  state: ProviderState = {},
  postType = 'post',
): PublishInput<LinkedinCredentials, LinkedinSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType,
    account: { providerAccountId: SUB },
    credentials: { accessToken: TOKEN },
    app: { clientId: '86abcdef123xyz', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
    settings: {},
    items: [item],
    state,
  };
}

export const post = (extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: POSTS,
  status: 201,
  headers: { 'x-restli-id': SHARE },
  ...extra,
});

export function json(request: RecordedRequest | undefined): unknown {
  if (typeof request?.body !== 'string') throw new Error('expected a JSON body');
  return JSON.parse(request.body);
}

export interface RunOptions {
  readonly state?: ProviderState;
  readonly postType?: string;
  readonly media?: Readonly<Record<string, TestMedia>>;
}

export async function run(
  item: PublishItem,
  exchanges: readonly ScriptedExchange[],
  options: RunOptions = {},
) {
  const http = scriptedHttp(exchanges);
  const context = testPublishContext(http, options.media ?? defaultMedia);
  const outcome = await linkedinRuntime
    .publish(context.ctx, input(item, options.state, options.postType))
    .then(
      (result: PublishOutcome) => ({ result, error: undefined }),
      (error: unknown) => {
        if (isProviderFailure(error)) return { result: undefined, error: error.error };
        throw error;
      },
    );
  http.assertDone();
  return { ...outcome, calls: http.calls, ...context };
}
