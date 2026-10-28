import {
  isProviderFailure,
  type MediaRef,
  type ProviderError,
  type ProviderState,
  type PublishInput,
  type PublishItem,
} from '@kronaut/core';
import { expect } from 'vitest';
import type { RecordedRequest, ScriptedExchange } from '../_kit/testing.ts';
import type { ThreadsSettings } from './manifest.ts';
import type { ThreadsCredentials } from './runtime.ts';

export const USER_ID = '1234567';
export const TOKEN = 'threads-token-canary-91fe';
export const GRAPH = 'https://graph.threads.com/v1.0';
export const CREATE = `${GRAPH}/${USER_ID}/threads?access_token=${TOKEN}`;
export const PUBLISH = `${GRAPH}/${USER_ID}/threads_publish?access_token=${TOKEN}`;
export const RECENT = `${GRAPH}/${USER_ID}/threads?fields=id%2Cpermalink%2Ctext%2Ctimestamp%2Cmedia_type%2Cchildren&limit=10&access_token=${TOKEN}`;
export const POST_ID = '18050000000000009';
export const PERMALINK = 'https://www.threads.com/@alice.example/post/DAbc123';
export const SENT_AT = '2026-10-21T12:00:00.000Z';
export const CONTAINER = '17890000000000001';

const credentials: ThreadsCredentials = {
  userId: USER_ID,
  accessToken: TOKEN,
  issuedAt: '2026-10-01T00:00:00Z',
  scopes: ['threads_basic', 'threads_content_publish'],
};

export const png: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/png',
  bytes: 3,
  aiGenerated: false,
};
export const jpeg: MediaRef = { ...png, id: 'm2', mime: 'image/jpeg' };
export const media = {
  m1: { url: 'https://media.example.org/m1?sig=s1', bytes: new Uint8Array([1]) },
  m2: { url: 'https://media.example.org/m2?sig=s2', bytes: new Uint8Array([2]) },
};

export function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

export function input(
  items: readonly PublishItem[],
  state: ProviderState = {},
  postType = 'post',
): PublishInput<ThreadsCredentials, ThreadsSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType,
    account: { providerAccountId: USER_ID },
    credentials,
    app: {
      clientId: '1122334455667788',
      clientSecret: 's',
      publicBaseUrl: 'https://k.example.org',
    },
    settings: {},
    items,
    state,
  };
}

export const statusUrl = (id: string) =>
  `${GRAPH}/${id}?fields=status%2Cerror_message&access_token=${TOKEN}`;
export const createdAs = (id: string): ScriptedExchange => ({
  method: 'POST',
  url: CREATE,
  json: { id },
});
export const status = (id: string, code: string, error?: string): ScriptedExchange => ({
  url: statusUrl(id),
  json: { id, status: code, ...(error === undefined ? {} : { error_message: error }) },
});
export const publishes = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: PUBLISH,
  json: { id: POST_ID },
  ...overrides,
});
export const permalink = (
  json: unknown = { id: POST_ID, permalink: PERMALINK },
): ScriptedExchange => ({
  url: `${GRAPH}/${POST_ID}?fields=permalink&access_token=${TOKEN}`,
  json,
});
export const graphError = (
  code: number,
  subcode?: number,
  extra = {},
): Partial<ScriptedExchange> => ({
  status: 400,
  json: { error: { message: 'm', type: 'OAuthException', code, error_subcode: subcode, ...extra } },
});

export function form(request: RecordedRequest | undefined): Record<string, string> {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
  return Object.fromEntries(new URLSearchParams(request.body));
}

export async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}
