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
import type { InstagramSettings } from './manifest.ts';
import type { InstagramCredentials } from './runtime.ts';

export const IG_ID = '17841400000000001';
const TOKEN = 'ig-token-canary-7c1d';
export const GRAPH = 'https://graph.instagram.com/v26.0';
export const MEDIA = `${GRAPH}/${IG_ID}/media?access_token=${TOKEN}`;
export const LIMIT = `${GRAPH}/${IG_ID}/content_publishing_limit?fields=quota_usage%2Cconfig&access_token=${TOKEN}`;
export const PUBLISH = `${GRAPH}/${IG_ID}/media_publish?access_token=${TOKEN}`;
export const RECENT = `${GRAPH}/${IG_ID}/media?fields=id%2Ctimestamp%2Cmedia_type%2Cmedia_product_type%2Cpermalink%2Calt_text&limit=10&access_token=${TOKEN}`;
export const PERMALINK = 'https://www.instagram.com/p/DAbc123/';
export const SENT_AT = '2026-10-21T12:00:00.000Z';

const credentials: InstagramCredentials = {
  userId: IG_ID,
  accessToken: TOKEN,
  issuedAt: '2026-10-01T00:00:00Z',
  scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
};

export function statusUrl(container: string): string {
  return `${GRAPH}/${container}?fields=status_code%2Cstatus&access_token=${TOKEN}`;
}

export function main(text: string, refs: readonly MediaRef[]): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

export function input(
  postType: string,
  items: readonly PublishItem[],
  state: ProviderState = {},
): PublishInput<InstagramCredentials, InstagramSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType,
    account: { providerAccountId: IG_ID },
    credentials,
    app: { clientId: '990011223344', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
    settings: {},
    items,
    state,
  };
}

export const createdAs = (id: string): ScriptedExchange => ({
  method: 'POST',
  url: MEDIA,
  json: { id },
});
export const status = (container: string, code: string, detail?: string): ScriptedExchange => ({
  url: statusUrl(container),
  json: { status_code: code, ...(detail === undefined ? {} : { status: detail }), id: container },
});
export const quota = (usage: number): ScriptedExchange => ({
  url: LIMIT,
  json: { data: [{ quota_usage: usage, config: { quota_total: 50, quota_duration: 86400 } }] },
});
export const publishes = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: PUBLISH,
  json: { id: '18000000000000009' },
  ...overrides,
});
export const permalink: ScriptedExchange = {
  url: `${GRAPH}/18000000000000009?fields=permalink&access_token=${TOKEN}`,
  json: { permalink: PERMALINK, id: '18000000000000009' },
};
export const graphError = (code: number, subcode: number): Partial<ScriptedExchange> => ({
  status: 400,
  json: { error: { message: 'm', type: 'OAuthException', code, error_subcode: subcode } },
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
