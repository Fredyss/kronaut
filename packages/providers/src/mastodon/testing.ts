import {
  isProviderFailure,
  type MediaRef,
  type ProviderError,
  type ProviderState,
  type PublishInput,
  type PublishItem,
} from '@kronaut/core';
import type { RecordedRequest, ScriptedExchange } from '../_kit/testing.ts';
import type { MastodonSettings } from './manifest.ts';
import type { MastodonCredentials } from './runtime.ts';

export const HOST = 'social.example.org';
export const ORIGIN = `https://${HOST}`;
export const TOKEN = 'CANARY_mastodon_token';
export const SENT_AT = '2026-10-21T12:00:00.000Z';
export const UPLOAD = `${ORIGIN}/api/v2/media`;
export const STATUSES = `${ORIGIN}/api/v1/statuses`;
export const STATUS_URL = `${ORIGIN}/@alice/113000000000000001`;
export const PUBLISHED = { kind: 'published', remoteId: '113000000000000001', url: STATUS_URL };

export const cat: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/png',
  bytes: 3,
  altText: 'A cat on a mat',
  aiGenerated: false,
};
const { altText: _alt, ...bare } = cat;
export const dog: MediaRef = { ...bare, id: 'm2', mime: 'image/jpeg' };
export const media = {
  m1: { url: 'https://media.example.org/m1', bytes: new Uint8Array([1, 2, 3]) },
  m2: { url: 'https://media.example.org/m2', bytes: new Uint8Array([4, 5, 6]) },
};

export const clip: MediaRef = {
  id: 'v1',
  sha256: 'b'.repeat(64),
  mime: 'video/mp4',
  bytes: 3,
  width: 1920,
  height: 1080,
  durationMs: 30_000,
  altText: 'A cat on a skateboard',
  aiGenerated: false,
};

export const uploads = (id: string, status = 200): ScriptedExchange => ({
  method: 'POST',
  url: UPLOAD,
  status,
  json: { id, type: 'image', url: status === 200 ? `${ORIGIN}/media/${id}.png` : null },
});
export const mediaStatus = (id: string, status: number): ScriptedExchange => ({
  url: `${ORIGIN}/api/v1/media/${id}`,
  status,
  json: status === 422 ? { error: 'Error processing thumbnail for uploaded media' } : { id },
});
export const posts = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: STATUSES,
  json: { id: '113000000000000001', url: STATUS_URL, uri: STATUS_URL },
  ...overrides,
});

export function form(request: RecordedRequest | undefined): [string, string][] {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  if (request.headers['content-type'] !== 'application/x-www-form-urlencoded')
    throw new Error('expected a form content type');
  return [...new URLSearchParams(request.body)];
}

export function multipartText(request: RecordedRequest | undefined): string {
  if (!(request?.body instanceof Uint8Array)) throw new Error('expected a multipart body');
  return new TextDecoder().decode(request.body);
}

export function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

export function input(
  items: readonly PublishItem[],
  state: ProviderState = {},
  attemptNo = 1,
  postType = 'post',
): PublishInput<MastodonCredentials, MastodonSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo,
    postType,
    account: { providerAccountId: `109876543210@${HOST}`, handle: `@alice@${HOST}` },
    credentials: { accessToken: TOKEN },
    app: {
      clientId: 'client-1',
      clientSecret: 's',
      publicBaseUrl: 'https://k.example.org',
      instanceHost: HOST,
    },
    settings: {},
    items,
    state,
  };
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
