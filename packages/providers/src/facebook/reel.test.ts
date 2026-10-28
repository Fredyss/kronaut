import { createHmac } from 'node:crypto';
import {
  isProviderFailure,
  type MediaRef,
  type ProviderApp,
  type ProviderState,
  type PublishInput,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  testPublishContext,
} from '../_kit/testing.ts';
import type { FacebookSettings } from './manifest.ts';
import { type FacebookCredentials, facebookRuntime } from './runtime.ts';

const PAGE_ID = '1012345678901234';
const TOKEN = 'page-token-canary-5d3e';
const SECRET = 'facebook-secret-canary-7c1a';
const PROOF = createHmac('sha256', SECRET).update(TOKEN).digest('hex');
const GRAPH = 'https://graph.facebook.com/v26.0';
const SIGNED = `access_token=${TOKEN}&appsecret_proof=${PROOF}`;
const REELS = `${GRAPH}/${PAGE_ID}/video_reels`;
const VIDEO_ID = '9900112233445566';
const RUPLOAD = `https://rupload.facebook.com/video-upload/v26.0/${VIDEO_ID}`;
const STATUS = `${GRAPH}/${VIDEO_ID}?fields=status&${SIGNED}`;
const SIGNED_URL = 'https://media.example.org/v1?sig=s1';
const SENT_AT = '2026-10-21T12:00:00.000Z';
const REEL_URL = `https://www.facebook.com/${VIDEO_ID}`;

const app: ProviderApp = {
  clientId: '1234567890123456',
  clientSecret: SECRET,
  publicBaseUrl: 'https://kronaut.example.org',
};

const clip: MediaRef = {
  id: 'v1',
  sha256: 'b'.repeat(64),
  mime: 'video/mp4',
  bytes: 50_000_000,
  width: 1080,
  height: 1920,
  durationMs: 30_000,
  aiGenerated: false,
};
const media = { v1: { url: SIGNED_URL, bytes: new Uint8Array([1]) } };
const signed = { access_token: TOKEN, appsecret_proof: PROOF };

function input(
  text: string,
  refs: readonly MediaRef[] = [clip],
  state: ProviderState = {},
): PublishInput<FacebookCredentials, FacebookSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'reel',
    account: { providerAccountId: PAGE_ID },
    credentials: { accessToken: TOKEN },
    app,
    settings: {},
    items: [{ position: 0, role: 'main', text, media: refs }],
    state,
  };
}

const started = (): ScriptedExchange => ({
  method: 'POST',
  url: REELS,
  json: { video_id: VIDEO_ID, upload_url: 'https://rupload.facebook.com/ignored' },
});
const pulled = (): ScriptedExchange => ({ method: 'POST', url: RUPLOAD, json: { success: true } });
const finished = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: REELS,
  json: { success: true },
  ...overrides,
});

interface Phases {
  readonly video?: string;
  readonly uploading?: string;
  readonly processing?: string;
  readonly publishing?: string;
  readonly publish?: string;
  readonly error?: string;
}

function status(phases: Phases): ScriptedExchange {
  const error = phases.error === undefined ? {} : { error: { message: phases.error } };
  return {
    url: STATUS,
    json: {
      status: {
        video_status: phases.video ?? 'processing',
        uploading_phase: { status: phases.uploading ?? 'completed', ...error },
        processing_phase: { status: phases.processing ?? 'in_progress' },
        publishing_phase: {
          status: phases.publishing ?? 'not_started',
          ...(phases.publish === undefined ? {} : { publish_status: phases.publish }),
        },
      },
    },
  };
}

const live = status({
  video: 'ready',
  processing: 'complete',
  publishing: 'complete',
  publish: 'published',
});

function form(request: RecordedRequest | undefined): Record<string, string> {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
  return Object.fromEntries(new URLSearchParams(request.body));
}

async function settle<T>(promise: Promise<T>) {
  return promise.then(
    (result) => ({ result, error: undefined }),
    (error: unknown) => {
      if (isProviderFailure(error)) return { result: undefined, error: error.error };
      throw error;
    },
  );
}

async function publish(
  exchanges: readonly ScriptedExchange[],
  options: {
    readonly text?: string;
    readonly refs?: readonly MediaRef[];
    readonly state?: ProviderState;
  } = {},
) {
  const http = scriptedHttp(exchanges);
  const context = testPublishContext(http, media);
  const request = input(options.text ?? 'Skate #cats', options.refs, options.state);
  const outcome = await settle<PublishOutcome>(facebookRuntime.publish(context.ctx, request));
  http.assertDone();
  return { ...outcome, calls: http.calls, ...context };
}

async function poll(
  exchanges: readonly ScriptedExchange[],
  state: ProviderState = { video: VIDEO_ID },
) {
  const http = scriptedHttp(exchanges);
  const { ctx } = testPublishContext(http, media);
  if (facebookRuntime.poll === undefined) throw new Error('facebook polls');
  const outcome = await settle<PublishOutcome>(
    facebookRuntime.poll(ctx, input('x', [clip], state)),
  );
  http.assertDone();
  return outcome;
}

async function verify(
  exchanges: readonly ScriptedExchange[],
  state: ProviderState = { video: VIDEO_ID },
) {
  const http = scriptedHttp(exchanges);
  const { ctx } = testPublishContext(http, media);
  if (facebookRuntime.verify === undefined) throw new Error('facebook verifies');
  return facebookRuntime.verify(ctx, input('x', [clip], state)) as Promise<VerifyOutcome>;
}

const PENDING = { kind: 'pending', pollAfterMs: 30_000 };
const uploaded = { video: VIDEO_ID, videoUploaded: true } as const;

describe('facebook reel: publish', () => {
  it('starts, pulls, checks the status, finishes and waits 30 s', async () => {
    const { result, calls, checkpoints, events } = await publish([
      started(),
      pulled(),
      status({ uploading: 'completed' }),
      finished(),
    ]);
    expect(result).toEqual(PENDING);
    expect(calls[0]?.url).toBe(REELS);
    expect(form(calls[0])).toEqual({ upload_phase: 'start', ...signed });
    expect(calls[1]?.url).toBe(RUPLOAD);
    expect(calls[1]?.body).toBeUndefined();
    expect(calls[1]?.headers).toMatchObject({
      Authorization: `OAuth ${TOKEN}`,
      file_url: SIGNED_URL,
    });
    expect(calls[2]?.url).toBe(STATUS);
    expect(calls[3]?.url).toBe(REELS);
    expect(form(calls[3])).toEqual({
      upload_phase: 'finish',
      video_id: VIDEO_ID,
      video_state: 'PUBLISHED',
      description: 'Skate #cats',
      ...signed,
    });
    expect(checkpoints).toEqual([{ video: VIDEO_ID }, uploaded, { ...uploaded, sentAt: SENT_AT }]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual([
      'step:upload_video',
      'step:publish_reel',
    ]);
  });

  it('waits without finishing while the upload is in progress, then resumes from state', async () => {
    const first = await publish([started(), pulled(), status({ uploading: 'in_progress' })]);
    expect(first.result).toEqual(PENDING);
    expect(first.checkpoints).toEqual([{ video: VIDEO_ID }, uploaded]);
    expect(first.events).not.toContain('step:publish_reel');

    const second = await publish([status({ uploading: 'complete' }), finished()], {
      state: uploaded,
    });
    expect(second.result).toEqual(PENDING);
    expect(second.calls.map((call) => call.url)).toEqual([STATUS, REELS]);
    expect(second.events.filter((event) => event.startsWith('step:'))).toEqual([
      'step:publish_reel',
    ]);
  });

  it('pulls again without a second start when only the video id is saved', async () => {
    const { result, calls, events } = await publish(
      [pulled(), status({ uploading: 'in_progress' })],
      { state: { video: VIDEO_ID } },
    );
    expect(result).toEqual(PENDING);
    expect(calls[0]?.url).toBe(RUPLOAD);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual(['step:upload_video']);
  });

  it('fails a failed or expired upload permanently before finishing', async () => {
    for (const [phases, expected] of [
      [
        { video: 'upload_failed', uploading: 'error', error: 'bad file' },
        { code: 'video_upload_failed', detail: 'bad file' },
      ],
      [{ video: 'error' }, { code: 'video_upload_failed' }],
      [{ video: 'expired' }, { code: 'video_expired' }],
    ] as const) {
      const { error, events } = await publish([status(phases)], { state: uploaded });
      expect(error).toEqual({ kind: 'permanent', ...expected });
      expect(events).not.toContain('step:publish_reel');
    }
  });

  it('sends is_ai_generated only for AI media and omits a blank description', async () => {
    const ai = { ...clip, aiGenerated: true };
    const labelled = await publish([status({}), finished()], { state: uploaded, refs: [ai] });
    expect(form(labelled.calls[1])).toMatchObject({
      description: 'Skate #cats',
      is_ai_generated: 'true',
    });
    const blank = await publish([status({}), finished()], { state: uploaded, text: '  ' });
    const fields = form(blank.calls[1]);
    expect(fields).not.toHaveProperty('description');
    expect(fields).not.toHaveProperty('is_ai_generated');
  });

  it('treats a finish HTTP 500 as ambiguous', async () => {
    const { error, checkpoints } = await publish(
      [status({}), finished({ status: 500, json: { error: { message: 'm' } } })],
      { state: uploaded },
    );
    expect(error).toEqual({ kind: 'ambiguous', detail: 'http_500' });
    expect(checkpoints.at(-1)).toEqual({ ...uploaded, sentAt: SENT_AT });
  });

  it.each([
    [{ code: 100, error_subcode: 1363129 }, 'frame_rate_unsupported', '100/1363129'],
    [{ code: 1363040 }, 'aspect_ratio_unsupported', '1363040'],
    [{ code: 6000 }, 'video_upload_failed', '6000'],
  ])('fails a finish rejected with %j permanently', async (graphError, code, detail) => {
    const { error } = await publish(
      [status({}), finished({ status: 400, json: { error: { message: 'm', ...graphError } } })],
      { state: uploaded },
    );
    expect(error).toEqual({ kind: 'permanent', code, detail });
  });

  it('retries a pull upload that failed mid-transfer', async () => {
    const { error, checkpoints } = await publish(
      [
        {
          method: 'POST',
          url: RUPLOAD,
          status: 400,
          text: '{"debug_info":{"type":"PartialRequestError"}}',
        },
      ],
      { state: { video: VIDEO_ID } },
    );
    expect(error).toEqual({ kind: 'transient', detail: 'PartialRequestError' });
    expect(checkpoints).toHaveLength(0);
  });

  it('fails a pull upload with a Graph error permanently', async () => {
    const { error } = await publish(
      [{ method: 'POST', url: RUPLOAD, status: 400, json: { error: { message: 'm', code: 100 } } }],
      { state: { video: VIDEO_ID } },
    );
    expect(error).toEqual({ kind: 'permanent', code: 'invalid_parameter', detail: '100' });
  });
});

describe('facebook reel: poll', () => {
  it('publishes with the video id once the publish status is published', async () => {
    expect((await poll([live])).result).toEqual({
      kind: 'published',
      remoteId: VIDEO_ID,
      url: REEL_URL,
    });
  });

  it('keeps waiting while processing', async () => {
    expect((await poll([status({ publishing: 'in_progress', publish: 'draft' })])).result).toEqual(
      PENDING,
    );
  });

  it('fails permanently on a phase error', async () => {
    const { error } = await poll([
      status({ video: 'error', processing: 'error', error: 'copyright' }),
    ]);
    expect(error).toEqual({ kind: 'permanent', code: 'reel_publish_failed', detail: 'copyright' });
  });

  it('needs the saved video id', async () => {
    expect((await poll([], {})).error).toEqual({ kind: 'permanent', code: 'state_invalid' });
  });
});

describe('facebook reel: verify', () => {
  it('finds a published reel', async () => {
    expect(await verify([live])).toEqual({ kind: 'found', remoteId: VIDEO_ID, url: REEL_URL });
  });

  it('is inconclusive while unpublished, without a video id, or when the read fails', async () => {
    expect(await verify([status({ publishing: 'in_progress', publish: 'draft' })])).toEqual({
      kind: 'inconclusive',
    });
    expect(await verify([], {})).toEqual({ kind: 'inconclusive' });
    expect(await verify([{ url: STATUS, status: 500, json: {} }])).toEqual({
      kind: 'inconclusive',
    });
  });
});

describe('facebook reel: input checks', () => {
  it('rejects unsuitable videos before any network call', async () => {
    for (const [ref, code] of [
      [{ ...clip, width: 1920, height: 1080 }, 'aspect_ratio_unsupported'],
      [{ ...clip, durationMs: 91_000 }, 'video_too_long'],
      [{ ...clip, durationMs: 2_000 }, 'video_too_short'],
      [{ ...clip, width: 480, height: 854 }, 'resolution_too_low'],
      [{ ...clip, mime: 'video/quicktime' }, 'video_required'],
    ] as const) {
      const { error, calls, checkpoints } = await publish([], { refs: [ref] });
      expect(error).toEqual({ kind: 'permanent', code });
      expect(calls).toHaveLength(0);
      expect(checkpoints).toHaveLength(0);
    }
  });

  it('requires exactly one video and allows empty text', async () => {
    expect((await publish([], { refs: [] })).error).toEqual({
      kind: 'permanent',
      code: 'video_required',
    });
    const two = [clip, { ...clip, id: 'v2' }];
    expect((await publish([], { refs: two })).error).toEqual({
      kind: 'permanent',
      code: 'too_many_images',
    });
    const { result } = await publish([status({}), finished()], { state: uploaded, text: '' });
    expect(result).toEqual(PENDING);
  });
});
