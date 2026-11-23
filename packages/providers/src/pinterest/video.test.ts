import type { MediaRef } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError } from '../_kit/testing.ts';
import { pinterestManifest } from './manifest.ts';
import {
  BOARD_ID,
  BOARD_PINS,
  json,
  PIN_ID,
  PINS_URL,
  pinterestError,
  run,
  SENT_AT,
  TOKEN,
  VIDEO,
} from './testing.ts';

const MEDIA_URL = 'https://api.pinterest.com/v5/media';
const MEDIA_ID = '5130000000000001';
const STATUS_URL = `${MEDIA_URL}/${MEDIA_ID}`;
const UPLOAD_URL = 'https://pinterest-media-upload.s3-accelerate.amazonaws.com/';
const PARAMS = {
  'Content-Type': 'multipart/form-data',
  key: 'uploads/canary-key/video.mp4',
  policy: 'policy-canary-91d2',
  'x-amz-algorithm': 'AWS4-HMAC-SHA256',
  'x-amz-credential': 'credential-canary-5e07',
  'x-amz-date': '20261123T120000Z',
  'x-amz-security-token': 'session-canary-c4a8',
  'x-amz-signature': 'signature-canary-b310',
};

const clip: MediaRef = {
  id: 'v1',
  sha256: 'b'.repeat(64),
  mime: 'video/mp4',
  bytes: VIDEO.byteLength,
  durationMs: 12_000,
  width: 1080,
  height: 1920,
  altText: 'A wooden table',
  aiGenerated: false,
};
const video = { postType: 'video', media: [clip] };
const uploadedState = { mediaId: MEDIA_ID, uploaded: true };

const registered = (uploadUrl = UPLOAD_URL) => ({
  method: 'POST',
  url: MEDIA_URL,
  status: 201,
  json: {
    media_id: MEDIA_ID,
    media_type: 'video',
    upload_url: uploadUrl,
    upload_parameters: PARAMS,
  },
});
const uploaded = (status = 204) => ({ method: 'POST', url: UPLOAD_URL, status });
const mediaStatus = (status: string) => ({ url: STATUS_URL, json: { media_id: MEDIA_ID, status } });
const created = { method: 'POST', url: PINS_URL, status: 201, json: { id: PIN_ID } };

function formNames(body: unknown): string[] {
  if (!(body instanceof Uint8Array)) throw new Error('expected a multipart body');
  const text = new TextDecoder().decode(body);
  return [...text.matchAll(/; name="([^"]+)"/g)].map((match) => match[1] ?? '');
}

function assertNoUploadSecrets(checkpoints: readonly unknown[]): void {
  const saved = JSON.stringify(checkpoints);
  for (const value of [UPLOAD_URL, ...Object.values(PARAMS)]) expect(saved).not.toContain(value);
}

describe('pinterest video publish', () => {
  it('registers, uploads, waits for processing, then creates the Pin', async () => {
    const first = await run(
      'publish',
      [registered(), uploaded(), mediaStatus('processing')],
      video,
    );
    expect(first.result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(first.checkpoints).toEqual([{ mediaId: MEDIA_ID }, uploadedState]);
    expect(first.events.filter((event) => event.startsWith('step:'))).toEqual([
      'step:register',
      'step:upload',
    ]);
    const [register, upload, status] = first.calls;
    expect(register?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    });
    expect(json(register?.body)).toEqual({ media_type: 'video' });
    expect(Object.keys(upload?.headers ?? {})).toEqual(['Content-Type']);
    expect(upload?.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(formNames(upload?.body)).toEqual([...Object.keys(PARAMS), 'file']);
    const form = new TextDecoder().decode(upload?.body as Uint8Array);
    for (const value of Object.values(PARAMS)) expect(form).toContain(`\r\n\r\n${value}\r\n`);
    expect(status?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });

    const second = await run('publish', [mediaStatus('succeeded'), created], {
      ...video,
      state: first.checkpoints.at(-1) ?? {},
    });
    expect(second.result).toEqual({
      kind: 'published',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
    assertPublicSendOrder(second.events, pinterestManifest);
    expect(second.checkpoints).toEqual([{ ...uploadedState, sentAt: SENT_AT }]);
    expect(json(second.calls[1]?.body)).toEqual({
      board_id: BOARD_ID,
      title: 'Autumn table',
      description: 'Oak, linen and late light.',
      link: 'https://shop.example.org/table',
      alt_text: 'A wooden table',
      media_source: { source_type: 'video_id', media_id: MEDIA_ID, cover_image_key_frame_time: 0 },
    });
    assertNoUploadSecrets([...first.checkpoints, ...second.checkpoints]);
  });

  it('registers a new upload when the last one never finished', async () => {
    const { result, calls } = await run(
      'publish',
      [registered(), uploaded(200), mediaStatus('registered')],
      { ...video, state: { mediaId: MEDIA_ID } },
    );
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(calls[0]?.url).toBe(MEDIA_URL);
  });

  it.each([
    ['another host', 'https://uploads.example.org/'],
    ['a lookalike host', `${UPLOAD_URL.slice(0, -1)}.example.org/`],
    ['plain http', UPLOAD_URL.replace('https:', 'http:')],
    ['no URL', 'not a url'],
  ])('refuses an upload URL with %s before sending to it', async (_name, uploadUrl) => {
    const { error, calls, events } = await run('publish', [registered(uploadUrl)], video);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_host_unexpected' });
    expect(calls).toHaveLength(1);
    expect(events).not.toContain('step:upload');
  });

  it('retries a refused upload safely, before any public step', async () => {
    const { error, events, checkpoints } = await run(
      'publish',
      [registered(), uploaded(403)],
      video,
    );
    expect(error).toEqual({ kind: 'transient', detail: 'upload_http_403' });
    expect(events).not.toContain('step:create');
    expect(checkpoints).toEqual([{ mediaId: MEDIA_ID }]);
    assertNoUploadSecrets(checkpoints);
  });

  it('retries an upload that hit the egress deadline, before any public step', async () => {
    const timedOut = { method: 'POST', url: UPLOAD_URL, error: egressError('timeout') };
    const { error, calls, events, checkpoints } = await run(
      'publish',
      [registered(), timedOut],
      video,
    );
    expect(error).toEqual({ kind: 'transient', detail: 'timeout' });
    expect(events).not.toContain('step:create');
    expect(calls.map((call) => call.url)).not.toContain(PINS_URL);
    expect(checkpoints).toEqual([{ mediaId: MEDIA_ID }]);
  });

  it.each([
    ['failed', { kind: 'permanent', code: 'video_processing_failed' }],
    ['archived', { kind: 'transient', detail: 'media_status_unknown' }],
  ])('stops on the media status %s', async (status, expected) => {
    const { error, events } = await run('publish', [mediaStatus(status)], {
      ...video,
      state: uploadedState,
    });
    expect(error).toEqual(expected);
    expect(events).not.toContain('step:create');
  });

  it('maps a refused status read as a private failure', async () => {
    const refused = { url: STATUS_URL, ...pinterestError(503, 1) };
    const { error } = await run('publish', [refused], { ...video, state: uploadedState });
    expect(error).toEqual({ kind: 'transient', detail: '503/1' });
  });

  it.each([
    ['no video', { media: [] }, 'video_required'],
    ['an image', { media: [{ ...clip, mime: 'image/jpeg' }] }, 'video_required'],
    ['a clip under 4 s', { media: [{ ...clip, durationMs: 3_999 }] }, 'video_too_short'],
    ['a clip over 15 min', { media: [{ ...clip, durationMs: 900_001 }] }, 'video_too_long'],
    ['a file over 50 MB', { media: [{ ...clip, bytes: 50_000_001 }] }, 'video_too_large'],
    ['alt text over 500', { media: [{ ...clip, altText: 'a'.repeat(501) }] }, 'alt_text_too_long'],
    ['no board', { settings: {} }, 'board_missing'],
    ['a malformed media id', { state: { mediaId: 'x1' } }, 'state_invalid'],
  ])('refuses %s before sending', async (_name, options, code) => {
    const { error, calls } = await run('publish', [], { ...video, ...options });
    expect(error).toEqual({ kind: 'permanent', code });
    expect(calls).toHaveLength(0);
  });
});

describe('pinterest video verify', () => {
  it('finds the video Pin on the board', async () => {
    const pin = {
      id: PIN_ID,
      created_at: '2026-10-21T12:00:05',
      title: 'Autumn table',
      description: 'Oak, linen and late light.',
      link: 'https://shop.example.org/table',
      alt_text: 'A wooden table',
    };
    const { result } = await run('verify', [{ url: BOARD_PINS, json: { items: [pin] } }], {
      ...video,
      state: { ...uploadedState, sentAt: SENT_AT },
    });
    expect(result).toEqual({
      kind: 'found',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
  });
});
