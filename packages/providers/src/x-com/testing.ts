import {
  type ChainLink,
  isProviderFailure,
  type MediaRef,
  type ProviderApp,
  type ProviderState,
  type PublishInput,
  type PublishItem,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import {
  type ScriptedExchange,
  scriptedHttp,
  testBaseContext,
  testPublishContext,
} from '../_kit/testing.ts';
import type { XSettings } from './manifest.ts';
import type { XCredentials } from './oauth.ts';
import { xRuntime } from './runtime.ts';

export const TOKEN = 'x-access-canary-5d2e';
export const REFRESH = 'x-refresh-canary-90af';
export const APP: ProviderApp = {
  clientId: 'Y2xpZW50LWlkLXg',
  clientSecret: 'CANARY_x_client_secret',
  publicBaseUrl: 'https://k.example.org',
};
export const REDIRECT = 'https://k.example.org/v1/oauth/x_com/callback';
export const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
export const REVOKE_URL = 'https://api.x.com/2/oauth2/revoke';
export const TWEETS_URL = 'https://api.x.com/2/tweets';
export const UPLOAD_URL = 'https://api.x.com/2/media/upload';
export const METADATA_URL = 'https://api.x.com/2/media/metadata';
export const USER_ID = '2244994945';
export const POST_ID = '1849000000000000001';
export const SENT_AT = '2026-10-21T12:00:00.000Z';
const IMAGE = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

export interface RunOptions {
  readonly items?: readonly PublishItem[];
  readonly chain?: readonly ChainLink[];
  readonly state?: ProviderState;
  readonly handle?: string;
}

export function photo(id: string, extra: Partial<MediaRef> = {}): MediaRef {
  return {
    id,
    sha256: 'a'.repeat(64),
    mime: 'image/jpeg',
    bytes: IMAGE.byteLength,
    width: 1200,
    height: 800,
    altText: `Alt for ${id}`,
    aiGenerated: false,
    ...extra,
  };
}

export function mainItem(text: string, media: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media };
}

function input(options: RunOptions): PublishInput<XCredentials, XSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'post',
    account: { providerAccountId: USER_ID, handle: options.handle ?? 'ada_dev' },
    credentials: { accessToken: TOKEN, refreshToken: REFRESH },
    app: APP,
    settings: {},
    items: options.items ?? [mainItem('Hello from Kronaut')],
    ...(options.chain === undefined ? {} : { chain: options.chain }),
    state: options.state ?? {},
  };
}

export function json(body: unknown): unknown {
  if (typeof body !== 'string') throw new Error('expected a JSON body');
  return JSON.parse(body);
}

export function form(body: unknown): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(String(body)));
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
  const refs = (options.items ?? []).flatMap((item) => item.media);
  const media = Object.fromEntries(
    refs.map((ref) => [ref.id, { url: `https://m.example.org/${ref.id}`, bytes: IMAGE }]),
  );
  const context = testPublishContext(http, media);
  const invoke = action === 'publish' ? xRuntime.publish : xRuntime.verify;
  if (invoke === undefined) throw new Error(`x has no ${action}`);
  const outcome = await settled<PublishOutcome | VerifyOutcome>(
    invoke(context.ctx, input(options)),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls, ...context };
}

export async function connect(
  exchanges: readonly ScriptedExchange[],
  pending: ProviderState = { verifier: 'v'.repeat(43) },
) {
  const http = scriptedHttp(exchanges);
  const outcome = await settled(
    xRuntime.connectFinish(testBaseContext(http), {
      app: APP,
      redirectUri: REDIRECT,
      pending,
      params: { code: 'code-1', state: 's' },
    }),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}

export async function withToken(
  action: 'refresh' | 'revoke',
  exchanges: readonly ScriptedExchange[],
) {
  const http = scriptedHttp(exchanges);
  const call = xRuntime[action];
  if (call === undefined) throw new Error(`x has no ${action}`);
  const { app, account, credentials } = input({});
  const outcome = await settled<unknown>(
    call(testBaseContext(http), { app, account, credentials }),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}
