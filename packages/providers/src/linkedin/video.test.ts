import type { ProviderState } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { egressError, type ScriptedExchange } from '../_kit/testing.ts';
import { linkedinManifest } from './manifest.ts';
import { json, main, post, REST_HEADERS, ref, run, SENT_AT, SHARE, TOKEN } from './testing.ts';

const INIT = 'https://api.linkedin.com/rest/videos?action=initializeUpload';
const FINALIZE = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';
const VIDEO = 'urn:li:video:D4E0AAA';
const STATUS = `https://api.linkedin.com/rest/videos/${encodeURIComponent(VIDEO)}`;
const PART = (n: number) => `https://www.linkedin.com/dms-uploads/video/part-${n}?ca=vector`;
const TOKEN_UPLOAD = 'upload-token-1';

const clip = ref('v1', { mime: 'video/mp4', bytes: 6, durationMs: 30_000, altText: 'Skatepark' });
const media = {
  v1: { url: 'https://media.example.org/v1', bytes: new Uint8Array([10, 11, 12, 13, 14, 15]) },
};
const instructions = [
  { firstByte: 0, lastByte: 3, uploadUrl: PART(1) },
  { firstByte: 4, lastByte: 5, uploadUrl: PART(2) },
];

const init = (
  uploadInstructions: readonly unknown[] = instructions,
  extra: Partial<ScriptedExchange> = {},
): ScriptedExchange => ({
  method: 'POST',
  url: INIT,
  json: { value: { video: VIDEO, uploadToken: TOKEN_UPLOAD, uploadInstructions } },
  ...extra,
});
const part = (n: number, extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'PUT',
  url: PART(n),
  headers: { etag: `"etag-${n}"` },
  ...extra,
});
const finalize = (extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: FINALIZE,
  status: 200,
  ...extra,
});
const status = (value: string, extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'GET',
  url: STATUS,
  json: { status: value },
  ...extra,
});
const upload = () => [init(), part(1), part(2), finalize()];

const video = (
  exchanges: readonly ScriptedExchange[],
  state: ProviderState = {},
  item = main('Clip', [clip]),
) => run(item, exchanges, { state, postType: 'video', media });

describe('linkedin video', () => {
  it('declares a single-video post type with the same text limits as post', () => {
    const [postType, videoType] = linkedinManifest.postTypes;
    expect(videoType?.id).toBe('video');
    expect(videoType?.text).toEqual(postType?.text);
    expect(videoType?.media.video?.mimes).toEqual(['video/mp4']);
    expect(videoType?.async).toEqual({ pollIntervalMs: 30_000, giveUpAfterMs: 30 * 60_000 });
  });

  it('initializes, uploads each part with its slice, finalizes with ETags in order, then posts', async () => {
    const { result, calls, checkpoints, events } = await video([
      ...upload(),
      status('AVAILABLE'),
      post(),
    ]);
    expect(result).toMatchObject({ kind: 'published', remoteId: SHARE });
    expect(calls[0]?.headers).toEqual(REST_HEADERS);
    expect(json(calls[0])).toEqual({
      initializeUploadRequest: {
        owner: 'urn:li:person:aB3_x-9Q',
        fileSizeBytes: 6,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    });
    for (const [index, bytes] of [
      [1, [10, 11, 12, 13]],
      [2, [14, 15]],
    ] as const) {
      expect(calls[index]?.method).toBe('PUT');
      expect(calls[index]?.headers).toEqual({
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/octet-stream',
      });
      expect(calls[index]?.body).toEqual(new Uint8Array(bytes));
    }
    expect(json(calls[3])).toEqual({
      finalizeUploadRequest: {
        video: VIDEO,
        uploadToken: TOKEN_UPLOAD,
        uploadedPartIds: ['"etag-1"', '"etag-2"'],
      },
    });
    expect(calls[4]?.method).toBe('GET');
    expect(calls[4]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Linkedin-Version': '202610',
      'X-Restli-Protocol-Version': '2.0.0',
    });
    expect(checkpoints).toEqual([{ video: VIDEO }, { video: VIDEO, sentAt: SENT_AT }]);
    expect(events[0]).toBe('step:upload_video');
    expect(JSON.stringify(checkpoints)).not.toContain('dms-uploads');
    expect(JSON.stringify(checkpoints)).not.toContain(TOKEN_UPLOAD);
  });

  it('attaches the video with alt text, and omits blank alt text', async () => {
    const withAlt = await video([...upload(), status('AVAILABLE'), post()]);
    expect(json(withAlt.calls[5])).toMatchObject({
      commentary: 'Clip',
      content: { media: { id: VIDEO, altText: 'Skatepark' } },
    });
    const blank = await video(
      [...upload(), status('AVAILABLE'), post()],
      {},
      main('', [{ ...clip, altText: '  ' }]),
    );
    expect(json(blank.calls[5])).toMatchObject({
      commentary: '',
      content: { media: { id: VIDEO } },
    });
    expect(JSON.stringify(json(blank.calls[5]))).not.toContain('altText');
  });

  it('returns pending with the URN checkpointed while processing, then posts without re-uploading', async () => {
    const first = await video([...upload(), status('PROCESSING')]);
    expect(first.result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(first.checkpoints).toEqual([{ video: VIDEO }]);
    expect(first.events).not.toContain('step:create_post');
    const second = await video([status('AVAILABLE'), post()], { video: VIDEO });
    expect(second.result).toMatchObject({ kind: 'published', remoteId: SHARE });
    expect(second.events[0]).toBe(`request:GET ${STATUS}`);
    expect(second.events).not.toContain('step:upload_video');
  });

  it.each(['WAITING_UPLOAD', 'SOMETHING_NEW'])('treats status %s as processing', async (value) => {
    const { result } = await video([status(value)], { video: VIDEO });
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
  });

  it('fails permanently when processing failed', async () => {
    const { error, calls } = await video([status('PROCESSING_FAILED')], { video: VIDEO });
    expect(error).toEqual({ kind: 'permanent', code: 'video_processing_failed' });
    expect(calls).toHaveLength(1);
  });

  it.each([401, 403])('posts anyway when the status read is answered with %s', async (code) => {
    const { result } = await video([status('x', { status: code }), post()], { video: VIDEO });
    expect(result).toMatchObject({ kind: 'published' });
  });

  it('maps other status read failures', async () => {
    const { error } = await video([status('x', { status: 503 })], { video: VIDEO });
    expect(error).toEqual({ kind: 'transient', detail: 'http_503' });
  });

  it('fails transiently when a part has no ETag, before finalizing', async () => {
    const { error, calls } = await video([init(), part(1, { headers: {} })]);
    expect(error).toEqual({ kind: 'transient', detail: 'etag_missing' });
    expect(calls).toHaveLength(2);
  });

  it('maps a failed part upload', async () => {
    const { error } = await video([init(), part(1, { status: 502 })]);
    expect(error).toEqual({ kind: 'transient', detail: 'http_502' });
    const timeout = await video([init(), part(1, { error: egressError('timeout') })]);
    expect(timeout.error).toEqual({ kind: 'transient', detail: 'timeout' });
  });

  it('maps a failed finalize', async () => {
    const { error } = await video([init(), part(1), part(2), finalize({ status: 500 })]);
    expect(error).toEqual({ kind: 'transient', detail: 'http_500' });
  });

  it.each([
    ['a gap', [instructions[0], { firstByte: 5, lastByte: 5, uploadUrl: PART(2) }]],
    ['an overlap', [instructions[0], { firstByte: 3, lastByte: 5, uploadUrl: PART(2) }]],
    ['a late start', [{ firstByte: 1, lastByte: 5, uploadUrl: PART(1) }]],
    ['a short end', [{ firstByte: 0, lastByte: 4, uploadUrl: PART(1) }]],
    ['an order swap', [instructions[1], instructions[0]]],
  ])('rejects non-contiguous instructions: %s', async (_name, list) => {
    const { error, calls } = await video([init(list)]);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_instructions_invalid' });
    expect(calls).toHaveLength(1);
  });

  it('refuses an untrusted part URL before sending bytes', async () => {
    const list = [{ firstByte: 0, lastByte: 5, uploadUrl: 'https://evil.example.org/x' }];
    const { error, calls } = await video([init(list)]);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_url_unexpected' });
    expect(calls).toHaveLength(1);
  });

  it('fails transiently when create_post says the asset is still waiting for upload', async () => {
    const waiting = post({
      status: 400,
      text: JSON.stringify({ status: 400, message: 'MEDIA_ASSET_WAITING_UPLOAD' }),
    });
    const { error, checkpoints } = await video([status('AVAILABLE'), waiting], { video: VIDEO });
    expect(error).toEqual({ kind: 'transient', detail: 'video_not_ready' });
    expect(checkpoints.at(0)).toEqual({ video: VIDEO, sentAt: SENT_AT });
  });

  it('fails permanently when create_post says processing failed, and maps other 400s as before', async () => {
    const failed = post({ status: 400, text: 'MEDIA_ASSET_PROCESSING_FAILED' });
    const first = await video([status('AVAILABLE'), failed], { video: VIDEO });
    expect(first.error).toEqual({ kind: 'permanent', code: 'video_processing_failed' });
    const other = await video([status('AVAILABLE'), post({ status: 400 })], { video: VIDEO });
    expect(other.error).toEqual({ kind: 'permanent', code: 'invalid_request', detail: 'http_400' });
  });

  it('treats a create_post without an id as ambiguous', async () => {
    const { error } = await video([status('AVAILABLE'), post({ headers: {} })], { video: VIDEO });
    expect(error?.kind).toBe('ambiguous');
  });

  it('allows empty text', async () => {
    const { result } = await video(
      [status('AVAILABLE'), post()],
      { video: VIDEO },
      main('', [clip]),
    );
    expect(result).toMatchObject({ kind: 'published' });
  });

  it.each([
    ['no media', main('x')],
    ['two videos', main('x', [clip, { ...clip, id: 'v2' }])],
  ])('rejects %s on a video post', async (_name, item) => {
    const { error, calls } = await video([], {}, item);
    expect(error).toEqual({ kind: 'permanent', code: 'video_required' });
    expect(calls).toHaveLength(0);
  });

  it('rejects an image on a video post and an mp4 on a regular post', async () => {
    const image = await video([], {}, main('x', [ref('m1')]));
    expect(image.error).toEqual({ kind: 'permanent', code: 'media_type_unsupported' });
    const mp4 = await run(main('x', [clip]), [], { media });
    expect(mp4.error).toEqual({ kind: 'permanent', code: 'video_unsupported' });
  });
});
