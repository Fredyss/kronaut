import { isProviderFailure, type MediaRef } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError } from '../_kit/testing.ts';
import { xManifest } from './manifest.ts';
import { checkMedia } from './media.ts';
import { json, mainItem, POST_ID, photo, run, TOKEN, TWEETS_URL, UPLOAD_URL } from './testing.ts';
import { CHUNK_BYTES } from './video.ts';

const MEDIA_ID = '1850000000000000007';
const INIT_URL = `${UPLOAD_URL}/initialize`;
const APPEND_URL = `${UPLOAD_URL}/${MEDIA_ID}/append`;
const FINALIZE_URL = `${UPLOAD_URL}/${MEDIA_ID}/finalize`;
const STATUS_URL = `${UPLOAD_URL}?command=STATUS&media_id=${MEDIA_ID}`;
const METADATA_URL = 'https://api.x.com/2/media/metadata';
const BYTES = Uint8Array.from({ length: 2 * CHUNK_BYTES + 10 }, (_, index) => index % 251);

const clip = (extra: Partial<MediaRef> = {}): MediaRef => ({
  id: 'v1',
  sha256: 'c'.repeat(64),
  mime: 'video/mp4',
  bytes: BYTES.byteLength,
  durationMs: 12_000,
  width: 1280,
  height: 720,
  altText: '',
  aiGenerated: false,
  ...extra,
});
const items = (ref = clip()) => [mainItem('A clip', [ref])];

const initialized = {
  method: 'POST',
  url: INIT_URL,
  json: { data: { id: MEDIA_ID, media_key: `7_${MEDIA_ID}`, expires_after_secs: 86_400 } },
};
const appended = { method: 'POST', url: APPEND_URL, json: { data: { expires_at: 1 } } };
const finalized = (processing?: unknown) => ({
  method: 'POST',
  url: FINALIZE_URL,
  json: { data: { id: MEDIA_ID, expires_after_secs: 3_600, processing_info: processing } },
});
const status = (state: string, check_after_secs?: number) => ({
  url: STATUS_URL,
  json: { data: { id: MEDIA_ID, processing_info: { state, check_after_secs } } },
});
const created = { method: 'POST', url: TWEETS_URL, status: 201, json: { data: { id: POST_ID } } };
const uploadCalls = [initialized, appended, appended, appended];
const waiting = {
  media: {
    v1: { id: MEDIA_ID, expiresAt: '2026-10-21T13:00:00.000Z', alt: false, processing: true },
  },
};

function refusal(media: readonly MediaRef[]): unknown {
  try {
    checkMedia(media);
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  return undefined;
}

function segment(body: unknown): { index: string; size: number; first: number } {
  if (!(body instanceof Uint8Array)) throw new Error('expected a multipart body');
  const buffer = Buffer.from(body);
  const text = buffer.toString('latin1');
  const index = /name="segment_index"\r\n\r\n(\d+)\r\n/.exec(text)?.[1] ?? '';
  const start = buffer.indexOf('\r\n\r\n', buffer.indexOf('name="media"')) + 4;
  const end = buffer.lastIndexOf('\r\n--');
  return { index, size: end - start, first: buffer[start] ?? -1 };
}

describe('x video publish', () => {
  it('uploads the video in ordered chunks, then attaches it', async () => {
    const { result, calls, events } = await run('publish', [...uploadCalls, finalized(), created], {
      items: items(),
      bytes: BYTES,
    });
    expect(result).toMatchObject({ kind: 'published', remoteId: POST_ID });
    expect(calls[0]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    });
    expect(json(calls[0]?.body)).toEqual({
      media_type: 'video/mp4',
      total_bytes: BYTES.byteLength,
      media_category: 'tweet_video',
    });
    expect(calls.slice(1, 4).map((call) => segment(call.body))).toEqual([
      { index: '0', size: CHUNK_BYTES, first: 0 },
      { index: '1', size: CHUNK_BYTES, first: CHUNK_BYTES % 251 },
      { index: '2', size: 10, first: (2 * CHUNK_BYTES) % 251 },
    ]);
    expect(calls[1]?.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(calls[4]?.body).toBeUndefined();
    expect(json(calls[5]?.body)).toEqual({ text: 'A clip', media: { media_ids: [MEDIA_ID] } });
    assertPublicSendOrder(events, xManifest);
  });

  it('waits for processing, then sets the alt text and posts', async () => {
    const ref = clip({ altText: 'A slow pan' });
    const first = await run(
      'publish',
      [...uploadCalls, finalized({ state: 'pending', check_after_secs: 1 })],
      { items: items(ref), bytes: BYTES },
    );
    expect(first.result).toEqual({ kind: 'pending', pollAfterMs: 5_000 });
    expect(first.checkpoints).toEqual([waiting]);

    const second = await run('publish', [status('in_progress', 12)], {
      items: items(ref),
      state: waiting,
    });
    expect(second.result).toEqual({ kind: 'pending', pollAfterMs: 12_000 });
    expect(second.checkpoints).toEqual([]);
    expect(second.calls[0]?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });

    const metadata = { method: 'POST', url: METADATA_URL, json: {} };
    const third = await run('publish', [status('succeeded'), metadata, created], {
      items: items(ref),
      state: waiting,
    });
    expect(third.result).toMatchObject({ kind: 'published', remoteId: POST_ID });
    expect(json(third.calls[1]?.body)).toEqual({
      id: MEDIA_ID,
      metadata: { alt_text: { text: 'A slow pan' } },
    });
    expect(third.checkpoints[0]).toEqual({
      media: { v1: { id: MEDIA_ID, expiresAt: '2026-10-21T13:00:00.000Z', alt: false } },
    });
  });

  it('polls at the manifest interval when X gives no wait', async () => {
    const { result } = await run('publish', [status('pending')], {
      items: items(),
      state: waiting,
    });
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 10_000 });
  });

  it('caps a long wait at a minute', async () => {
    const { result } = await run('publish', [status('in_progress', 600)], {
      items: items(),
      state: waiting,
    });
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 60_000 });
  });

  it('fails for good when processing fails', async () => {
    const fromFinalize = await run('publish', [...uploadCalls, finalized({ state: 'failed' })], {
      items: items(),
      bytes: BYTES,
    });
    expect(fromFinalize.error).toEqual({ kind: 'permanent', code: 'video_processing_failed' });
    const fromStatus = await run('publish', [status('failed')], { items: items(), state: waiting });
    expect(fromStatus.error).toEqual({ kind: 'permanent', code: 'video_processing_failed' });
  });

  it('retries an unknown processing state', async () => {
    const { error } = await run('publish', [status('queued')], { items: items(), state: waiting });
    expect(error).toEqual({ kind: 'transient', detail: 'media_state_unknown' });
  });

  it('retries a timed-out chunk or status check', async () => {
    const append = await run(
      'publish',
      [initialized, { method: 'POST', url: APPEND_URL, error: egressError('timeout') }],
      { items: items(), bytes: BYTES },
    );
    expect(append.error).toEqual({ kind: 'transient', detail: 'timeout' });
    const poll = await run('publish', [{ url: STATUS_URL, error: egressError('timeout') }], {
      items: items(),
      state: waiting,
    });
    expect(poll.error).toEqual({ kind: 'transient', detail: 'timeout' });
  });

  it('uploads again when the processing upload expired', async () => {
    const expired = {
      media: { v1: { ...waiting.media.v1, expiresAt: '2026-10-21T12:04:00.000Z' } },
    };
    const { result } = await run('publish', [...uploadCalls, finalized(), created], {
      items: items(),
      state: expired,
      bytes: BYTES,
    });
    expect(result).toMatchObject({ kind: 'published', remoteId: POST_ID });
  });

  it.each([
    ['a video next to a photo', [clip(), photo('m1')], 'media_mixed'],
    ['two videos', [clip(), clip({ id: 'v2' })], 'too_many_videos'],
    ['a QuickTime file', [clip({ mime: 'video/quicktime' })], 'media_type_unsupported'],
    ['a video over 20 minutes', [clip({ durationMs: 1_200_001 })], 'video_duration_unsupported'],
    ['a video under half a second', [clip({ durationMs: 499 })], 'video_duration_unsupported'],
    ['a video over 8 GB', [clip({ bytes: 8_000_000_001 })], 'video_too_large'],
  ])('refuses %s', (_name, media, code) => {
    expect(refusal(media)).toEqual({ kind: 'permanent', code });
  });

  it('allows one video of the longest length', () => {
    expect(refusal([clip({ durationMs: 1_200_000 })])).toBeUndefined();
  });
});
