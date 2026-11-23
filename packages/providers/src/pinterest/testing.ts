import {
  isProviderFailure,
  type MediaRef,
  type ProviderApp,
  type ProviderState,
  type PublishInput,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import {
  type ScriptedExchange,
  scriptedHttp,
  testBaseContext,
  testPublishContext,
} from '../_kit/testing.ts';
import type { PinterestSettings } from './manifest.ts';
import type { PinterestCredentials } from './oauth.ts';
import { pinterestRuntime } from './runtime.ts';

export const TOKEN = 'pina-access-canary-3f9b';
const REFRESH = 'pinr-refresh-canary-a71c';
export const APP: ProviderApp = {
  clientId: '1234567',
  clientSecret: 'CANARY_pinterest_client_secret',
  publicBaseUrl: 'https://k.example.org',
};
export const REDIRECT = 'https://k.example.org/v1/oauth/pinterest/callback';
export const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';
export const PINS_URL = 'https://api.pinterest.com/v5/pins';
export const BOARD_ID = '549755885175';
export const BOARD_PINS = `https://api.pinterest.com/v5/boards/${BOARD_ID}/pins?page_size=100`;
export const PIN_ID = '813744226420795884';
export const SENT_AT = '2026-10-21T12:00:00.000Z';
export const IMAGE = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
export const VIDEO = Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]);
const SETTINGS: PinterestSettings = {
  boardId: BOARD_ID,
  title: 'Autumn table',
  link: 'https://shop.example.org/table',
};

export interface RunOptions {
  readonly postType?: string;
  readonly settings?: PinterestSettings;
  readonly state?: ProviderState;
  readonly ref?: Partial<MediaRef>;
  readonly media?: readonly MediaRef[];
  readonly text?: string;
}

export function photo(extra: Partial<MediaRef> = {}): MediaRef {
  return {
    id: 'm1',
    sha256: 'a'.repeat(64),
    mime: 'image/jpeg',
    bytes: IMAGE.byteLength,
    width: 1000,
    height: 1500,
    altText: 'A wooden table',
    aiGenerated: false,
    ...extra,
  };
}

function input(options: RunOptions = {}): PublishInput<PinterestCredentials, PinterestSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: options.postType ?? 'pin',
    account: { providerAccountId: '1100000000000001', handle: 'ada' },
    credentials: { accessToken: TOKEN, refreshToken: REFRESH },
    app: APP,
    settings: options.settings ?? SETTINGS,
    items: [
      {
        position: 0,
        role: 'main',
        text: options.text ?? 'Oak, linen and late light.',
        media: options.media ?? [photo(options.ref)],
      },
    ],
    state: options.state ?? {},
  };
}

export const pinterestError = (status: number, code: number, message = 'refused') => ({
  status,
  json: { code, message },
});

export function json(body: unknown): unknown {
  if (typeof body !== 'string') throw new Error('expected a JSON body');
  return JSON.parse(body);
}

function settled<T>(promise: Promise<T>) {
  return promise.then(
    (result) => ({ result, error: undefined }),
    (error: unknown) => {
      if (isProviderFailure(error)) return { result: undefined, error: error.error };
      throw error;
    },
  );
}

export async function run(
  action: 'publish' | 'verify',
  exchanges: readonly ScriptedExchange[],
  options: RunOptions = {},
) {
  const http = scriptedHttp(exchanges);
  const refs = options.media ?? [photo(options.ref)];
  const media = Object.fromEntries(
    refs.map((ref) => [
      ref.id,
      { url: `https://m.example.org/${ref.id}`, bytes: ref.mime === 'video/mp4' ? VIDEO : IMAGE },
    ]),
  );
  const context = testPublishContext(http, media);
  const invoke = action === 'publish' ? pinterestRuntime.publish : pinterestRuntime.verify;
  if (invoke === undefined) throw new Error(`pinterest has no ${action}`);
  const outcome = await settled<PublishOutcome | VerifyOutcome>(
    invoke(context.ctx, input(options)),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls, ...context };
}

export async function connect(
  exchanges: readonly ScriptedExchange[],
  params: Readonly<Record<string, string>> = { code: 'code-1', state: 's' },
) {
  const http = scriptedHttp(exchanges);
  const outcome = await settled(
    pinterestRuntime.connectFinish(testBaseContext(http), {
      app: APP,
      redirectUri: REDIRECT,
      pending: {},
      params,
    }),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}

export async function refresh(exchange: ScriptedExchange) {
  const http = scriptedHttp([exchange]);
  if (pinterestRuntime.refresh === undefined) throw new Error('pinterest refreshes tokens');
  const { app, account, credentials } = input();
  const outcome = await settled(
    pinterestRuntime.refresh(testBaseContext(http), { app, account, credentials }),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}
