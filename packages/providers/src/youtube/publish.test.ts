import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError } from '../_kit/testing.ts';
import { youtubeManifest } from './manifest.ts';
import {
  googleError,
  INITIATE,
  initiated,
  json,
  publish,
  resumeIncomplete,
  SENT_AT,
  SESSION,
  TOKEN,
  uploaded,
  VIDEO_ID,
  videoBytes,
  WATCH,
} from './testing.ts';
import { CHUNK_BYTES } from './upload.ts';

const SIZE = CHUNK_BYTES + 1_000;
const HALF = CHUNK_BYTES / 2;
const sent = { sessionUri: SESSION, sentAt: SENT_AT };
const done = { sentAt: SENT_AT, videoId: VIDEO_ID };

describe('youtube publish', () => {
  it('initiates a resumable upload, then sends 4 MiB chunks after the write-ahead marker', async () => {
    const { result, calls, checkpoints, events } = await publish(
      [initiated(), resumeIncomplete(CHUNK_BYTES - 1), uploaded()],
      { size: SIZE },
    );
    expect(result).toEqual({ kind: 'published', remoteId: VIDEO_ID, url: WATCH });
    expect(calls[0]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(SIZE),
      'X-Upload-Content-Type': 'video/mp4',
    });
    expect(json(calls[0])).toEqual({
      snippet: { title: 'Launch day', description: 'Behind the scenes' },
      status: { privacyStatus: 'unlisted', containsSyntheticMedia: false },
    });
    const bytes = videoBytes(SIZE);
    expect(calls[1]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${CHUNK_BYTES - 1}/${SIZE}`,
    });
    expect(calls[1]?.body).toEqual(bytes.subarray(0, CHUNK_BYTES));
    expect(calls[2]?.headers['Content-Range']).toBe(`bytes ${CHUNK_BYTES}-${SIZE - 1}/${SIZE}`);
    expect(calls[2]?.body).toEqual(bytes.subarray(CHUNK_BYTES));
    expect(checkpoints).toEqual([{ sessionUri: SESSION }, sent, done]);
    assertPublicSendOrder(events, youtubeManifest);
    expect(events.slice(0, 3)).toEqual([
      `request:POST ${INITIATE}`,
      'checkpoint',
      'step:upload_video',
    ]);
  });

  it('declares made for kids only when set, and the synthetic media flag from the upload', async () => {
    const { calls } = await publish([initiated(), uploaded()], {
      settings: { title: 'Kids', privacy: 'private', madeForKids: false },
      ref: { aiGenerated: true },
    });
    expect(json(calls[0])).toEqual({
      snippet: { title: 'Kids', description: 'Behind the scenes' },
      status: {
        privacyStatus: 'private',
        containsSyntheticMedia: true,
        selfDeclaredMadeForKids: false,
      },
    });
  });

  it('resends from the offset the Range reports, never assuming the chunk landed', async () => {
    const { result, calls } = await publish([initiated(), resumeIncomplete(HALF - 1), uploaded()], {
      size: SIZE,
    });
    expect(result).toMatchObject({ kind: 'published', remoteId: VIDEO_ID });
    expect(calls[2]?.headers['Content-Range']).toBe(`bytes ${HALF}-${SIZE - 1}/${SIZE}`);
    expect(calls[2]?.body).toEqual(videoBytes(SIZE).subarray(HALF));
  });

  it('treats a 308 that makes no progress as ambiguous', async () => {
    const { error } = await publish([initiated(), resumeIncomplete()], { size: SIZE });
    expect(error).toEqual({ kind: 'ambiguous', detail: 'upload_stalled' });
  });

  it('resumes a stored session at the offset the status query reports', async () => {
    const { result, calls, checkpoints, events } = await publish(
      [resumeIncomplete(CHUNK_BYTES - 1), uploaded()],
      { size: SIZE, state: sent },
    );
    expect(result).toMatchObject({ kind: 'published', remoteId: VIDEO_ID });
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      url: SESSION,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Length': '0',
        'Content-Range': `bytes */${SIZE}`,
      },
    });
    expect(calls[0]?.body).toBeUndefined();
    expect(calls[1]?.headers['Content-Range']).toBe(`bytes ${CHUNK_BYTES}-${SIZE - 1}/${SIZE}`);
    expect(events[0]).toBe('step:upload_video');
    expect(events.filter((event) => event === 'step:upload_video')).toHaveLength(1);
    expect(checkpoints).toEqual([done]);
  });

  it('marks the send before the first chunk of a session that was opened but never sent', async () => {
    const { checkpoints, events, calls } = await publish([resumeIncomplete(), uploaded()], {
      state: { sessionUri: SESSION },
    });
    expect(calls[1]?.headers['Content-Range']).toBe('bytes 0-9/10');
    expect(checkpoints).toEqual([sent, done]);
    assertPublicSendOrder(events, youtubeManifest);
  });

  it('finishes without sending when the status query says the upload completed', async () => {
    const { result, calls, checkpoints } = await publish([uploaded()], { state: sent });
    expect(result).toEqual({ kind: 'published', remoteId: VIDEO_ID, url: WATCH });
    expect(calls).toHaveLength(1);
    expect(checkpoints).toEqual([done]);
  });

  it('returns a recorded video without calling YouTube', async () => {
    const { result, calls } = await publish([], { state: done });
    expect(result).toEqual({ kind: 'published', remoteId: VIDEO_ID, url: WATCH });
    expect(calls).toHaveLength(0);
  });

  it('starts a new session when the stored one expired before any byte was sent', async () => {
    const expired = { method: 'PUT', url: SESSION, status: 404 };
    const { result, checkpoints, events } = await publish([expired, initiated(), uploaded()], {
      state: { sessionUri: SESSION },
    });
    expect(result).toMatchObject({ kind: 'published', remoteId: VIDEO_ID });
    expect(checkpoints).toEqual([{ sessionUri: SESSION }, sent, done]);
    assertPublicSendOrder(events, youtubeManifest);
  });

  it('never re-uploads when the session expired after the send began', async () => {
    const expired = { method: 'PUT', url: SESSION, status: 404 };
    const { error, calls, checkpoints } = await publish([expired], { state: sent });
    expect(error).toEqual({ kind: 'ambiguous', detail: 'upload_session_expired' });
    expect(calls).toHaveLength(1);
    expect(checkpoints).toEqual([]);
  });

  it.each([
    ['2026-10-31T12:00:00Z', '2026-11-01T07:00:00Z'],
    ['2026-11-01T12:00:00Z', '2026-11-02T08:00:00Z'],
    ['2026-03-08T07:30:00Z', '2026-03-08T08:00:00Z'],
    ['2026-03-08T12:00:00Z', '2026-03-09T07:00:00Z'],
  ])('maps the quota errors at %s to a reset at the next Pacific midnight', async (at, reset) => {
    const now = Temporal.Instant.from(at);
    const resetAt = Temporal.Instant.from(reset);
    const quota = await publish([googleError(403, 'quotaExceeded')], { now });
    expect(quota.error).toEqual({ kind: 'rate_limited', scope: 'app', resetAt });
    const channel = await publish([googleError(400, 'uploadLimitExceeded')], { now });
    expect(channel.error).toEqual({ kind: 'rate_limited', scope: 'account', resetAt });
  });

  it.each([
    [googleError(400, 'invalidTitle'), { kind: 'permanent', code: 'invalid_title' }],
    [
      googleError(401, 'youtubeSignupRequired'),
      { kind: 'permanent', code: 'youtube_signup_required' },
    ],
    [
      googleError(403, 'forbiddenPrivacySetting'),
      { kind: 'permanent', code: 'forbidden_privacy_setting' },
    ],
    [googleError(401, 'authorizationRequired'), { kind: 'auth_expired' }],
    [
      { ...initiated(), status: 503 },
      { kind: 'transient', detail: 'http_503' },
    ],
    [
      { ...initiated(), status: 429 },
      { kind: 'transient', detail: 'http_429' },
    ],
    [
      { ...initiated(), error: egressError('timeout') },
      { kind: 'transient', detail: 'timeout' },
    ],
  ])('maps an initiation failure as a private step: %#', async (exchange, expected) => {
    const { error, checkpoints, events } = await publish([exchange]);
    expect(error).toMatchObject(expected);
    expect(checkpoints).toEqual([]);
    expect(events).not.toContain('step:upload_video');
  });

  it.each([
    [
      { ...uploaded(), status: 503 },
      { kind: 'ambiguous', detail: 'http_503' },
    ],
    [
      { ...uploaded(), status: 404 },
      { kind: 'ambiguous', detail: 'http_404' },
    ],
    [
      { ...uploaded(), status: 429 },
      { kind: 'ambiguous', detail: 'http_429' },
    ],
    [
      { ...uploaded(), error: egressError('timeout') },
      { kind: 'ambiguous', detail: 'timeout' },
    ],
    [{ ...uploaded(), json: { id: 'not a video id' } }, { kind: 'ambiguous' }],
    [googleError(403, 'forbidden', 'PUT', SESSION), { kind: 'permanent', code: 'forbidden' }],
  ])('maps a chunk failure after the marker: %#', async (exchange, expected) => {
    const { error } = await publish([initiated(), exchange]);
    expect(error).toMatchObject(expected);
  });

  it.each([
    ['another host', 'https://uploads.example.org/upload?upload_id=x'],
    ['plain http', 'http://www.googleapis.com/upload?upload_id=x'],
    ['another port', 'https://www.googleapis.com:8443/upload?upload_id=x'],
    ['credentials', 'https://user:pw@www.googleapis.com/upload?upload_id=x'],
  ])('refuses a session URI on %s before sending a byte', async (_name, location) => {
    const { error, calls, checkpoints } = await publish([initiated({ headers: { location } })]);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_url_invalid' });
    expect(calls).toHaveLength(1);
    expect(checkpoints).toEqual([]);
  });

  it('refuses a missing session URI', async () => {
    const { error } = await publish([initiated({ headers: {} })]);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_url_invalid' });
  });

  it('never logs the session URI or puts it in an error, and drops it once uploaded', async () => {
    const runs = [
      await publish([initiated(), resumeIncomplete(CHUNK_BYTES - 1), uploaded()], { size: SIZE }),
      await publish([initiated(), { ...uploaded(), error: egressError('network') }]),
      await publish([{ ...uploaded(), status: 500 }], { state: sent }),
      await publish([{ method: 'PUT', url: SESSION, status: 404 }], { state: sent }),
      await publish([resumeIncomplete(), { ...uploaded(), status: 410 }], { state: sent }),
    ];
    for (const { logged, error } of runs) {
      expect(JSON.stringify({ logged, error })).not.toContain('upload_id');
    }
    expect(runs.map(({ error }) => error?.kind)).toEqual([
      undefined,
      'ambiguous',
      'ambiguous',
      'ambiguous',
      'ambiguous',
    ]);
    expect(runs[0]?.checkpoints.at(-1)).toEqual(done);
  });

  it('refuses a destination without a title or without exactly one video', async () => {
    const untitled = await publish([], { settings: { title: '  ', privacy: 'public' } });
    expect(untitled.error).toEqual({ kind: 'permanent', code: 'title_missing' });
    const image = await publish([], { ref: { mime: 'image/png' } });
    expect(image.error).toEqual({ kind: 'permanent', code: 'video_required' });
  });
});
