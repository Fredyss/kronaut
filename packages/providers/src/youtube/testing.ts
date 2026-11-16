import {
  isProviderFailure,
  type MediaRef,
  type ProviderLogger,
  type ProviderState,
  type PublishInput,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import {
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import type { YoutubeSettings } from './manifest.ts';
import type { YoutubeCredentials } from './oauth.ts';
import { youtubeRuntime } from './runtime.ts';

export const TOKEN = 'youtube-access-canary-7c1e';
export const REFRESH = 'youtube-refresh-canary-41d0';
export const INITIATE =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
export const SESSION = `${INITIATE}&upload_id=CANARY_upload_session_9f3a`;
export const VIDEO_ID = 'Ab3_x-9QzZ1';
export const WATCH = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
export const SENT_AT = '2026-10-21T12:00:00.000Z';
const SETTINGS: YoutubeSettings = { title: 'Launch day', privacy: 'unlisted' };

function clip(bytes: number, extra: Partial<MediaRef> = {}): MediaRef {
  return {
    id: 'v1',
    sha256: 'a'.repeat(64),
    mime: 'video/mp4',
    bytes,
    width: 1920,
    height: 1080,
    durationMs: 30_000,
    aiGenerated: false,
    ...extra,
  };
}

export function videoBytes(size: number): Uint8Array {
  return Uint8Array.from({ length: size }, (_, index) => index % 251);
}

export interface RunOptions {
  readonly size?: number;
  readonly state?: ProviderState;
  readonly settings?: YoutubeSettings;
  readonly ref?: Partial<MediaRef>;
  readonly now?: Temporal.Instant;
}

export function input(options: RunOptions = {}): PublishInput<YoutubeCredentials, YoutubeSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'video',
    account: { providerAccountId: 'UCabcdefghijklmnopqrstuv' },
    credentials: { accessToken: TOKEN, refreshToken: REFRESH },
    app: { clientId: 'client-1', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
    settings: options.settings ?? SETTINGS,
    items: [
      {
        position: 0,
        role: 'main',
        text: 'Behind the scenes',
        media: [clip(options.size ?? 10, options.ref)],
      },
    ],
    state: options.state ?? {},
  };
}

export const initiated = (extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: INITIATE,
  headers: { location: SESSION },
  ...extra,
});

export const resumeIncomplete = (last?: number): ScriptedExchange => ({
  method: 'PUT',
  url: SESSION,
  status: 308,
  headers: last === undefined ? {} : { range: `bytes=0-${last}` },
});

export const uploaded = (extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'PUT',
  url: SESSION,
  status: 201,
  json: { kind: 'youtube#video', id: VIDEO_ID },
  ...extra,
});

export const googleError = (status: number, reason: string, method = 'POST', url = INITIATE) => ({
  method,
  url,
  status,
  json: { error: { code: status, errors: [{ reason, domain: 'youtube.video' }] } },
});

export function json(request: RecordedRequest | undefined): unknown {
  if (typeof request?.body !== 'string') throw new Error('expected a JSON body');
  return JSON.parse(request.body);
}

function recordingLogger(lines: unknown[]): ProviderLogger {
  const record = (fields: Record<string, unknown>, msg: string) => lines.push({ fields, msg });
  return { debug: record, info: record, warn: record, error: record };
}

type Action = 'publish' | 'verify';

async function call(action: Action, exchanges: readonly ScriptedExchange[], options: RunOptions) {
  const http = scriptedHttp(exchanges);
  const size = options.size ?? 10;
  const context = testPublishContext(
    http,
    { v1: { url: 'https://media.example.org/v1', bytes: videoBytes(size) } },
    options.now ?? TEST_NOW,
  );
  const logged: unknown[] = [];
  const ctx = { ...context.ctx, logger: recordingLogger(logged) };
  const runtime = youtubeRuntime;
  const invoke = action === 'publish' ? runtime.publish : runtime.verify;
  if (invoke === undefined) throw new Error(`youtube has no ${action}`);
  const outcome = await invoke(ctx, input(options)).then(
    (result: unknown) => ({ result, error: undefined }),
    (error: unknown) => {
      if (isProviderFailure(error)) return { result: undefined, error: error.error };
      throw error;
    },
  );
  http.assertDone();
  return { ...outcome, calls: http.calls, logged, ...context };
}

export function publish(exchanges: readonly ScriptedExchange[], options: RunOptions = {}) {
  return call('publish', exchanges, options);
}

export function verify(exchanges: readonly ScriptedExchange[], options: RunOptions = {}) {
  return call('verify', exchanges, options);
}
