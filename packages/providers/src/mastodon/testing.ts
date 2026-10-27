import {
  isProviderFailure,
  type MediaRef,
  type ProviderError,
  type ProviderState,
  type PublishInput,
  type PublishItem,
} from '@kronaut/core';
import type { MastodonSettings } from './manifest.ts';
import type { MastodonCredentials } from './runtime.ts';

export const HOST = 'social.example.org';
export const ORIGIN = `https://${HOST}`;
export const TOKEN = 'CANARY_mastodon_token';
export const SENT_AT = '2026-10-21T12:00:00.000Z';

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

export function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

export function input(
  items: readonly PublishItem[],
  state: ProviderState = {},
  attemptNo = 1,
): PublishInput<MastodonCredentials, MastodonSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo,
    postType: 'post',
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
