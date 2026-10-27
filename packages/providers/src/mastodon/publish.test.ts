import type { MediaRef, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  egressError,
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { idempotencyKey } from './publish-state.ts';
import { mastodonRuntime } from './runtime.ts';
import { cat, dog, failureOf, input, main, media, ORIGIN, SENT_AT, TOKEN } from './testing.ts';

const UPLOAD = `${ORIGIN}/api/v2/media`;
const STATUSES = `${ORIGIN}/api/v1/statuses`;
const STATUS_URL = `${ORIGIN}/@alice/113000000000000001`;
const KEY = idempotencyKey('dest-1', 0);

const uploads = (id: string, status = 200): ScriptedExchange => ({
  method: 'POST',
  url: UPLOAD,
  status,
  json: { id, type: 'image', url: status === 200 ? `${ORIGIN}/media/${id}.png` : null },
});
const mediaStatus = (id: string, status: number): ScriptedExchange => ({
  url: `${ORIGIN}/api/v1/media/${id}`,
  status,
  json: status === 422 ? { error: 'Error processing thumbnail for uploaded media' } : { id },
});
const posts = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: STATUSES,
  json: { id: '113000000000000001', url: STATUS_URL, uri: STATUS_URL },
  ...overrides,
});

function form(request: RecordedRequest | undefined): [string, string][] {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
  return [...new URLSearchParams(request.body)];
}

function multipartText(request: RecordedRequest | undefined): string {
  if (!(request?.body instanceof Uint8Array)) throw new Error('expected a multipart body');
  return new TextDecoder().decode(request.body);
}

const PUBLISHED = { kind: 'published', remoteId: '113000000000000001', url: STATUS_URL };

describe('mastodon publish', () => {
  it('uploads with the alt text as description, waits for processing, then posts with media ids', async () => {
    const http = scriptedHttp([uploads('201', 202), uploads('202'), mediaStatus('201', 206)]);
    const first = testPublishContext(http, media);
    const pending = await mastodonRuntime.publish(first.ctx, input([main('Pets', [cat, dog])]));
    http.assertDone();
    expect(pending).toEqual({ kind: 'pending', pollAfterMs: 5_000 });
    const body = multipartText(http.calls[0]);
    expect(http.calls[0]?.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(http.calls[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(body).toContain('name="description"\r\n\r\nA cat on a mat\r\n');
    expect(body).toContain('name="file"; filename="upload.png"\r\nContent-Type: image/png');
    expect(multipartText(http.calls[1])).not.toContain('name="description"');
    const uploaded = { m1: { id: '201', ready: false }, m2: { id: '202', ready: true } };
    expect(first.checkpoints.at(-1)).toEqual({ media: uploaded });

    const resumed = scriptedHttp([mediaStatus('201', 200), posts()]);
    const second = testPublishContext(resumed, media);
    const result = await mastodonRuntime.publish(
      second.ctx,
      input([main('Pets', [cat, dog])], { media: uploaded }, 2),
    );
    resumed.assertDone();
    expect(result).toEqual(PUBLISHED);
    expect(form(resumed.calls[1])).toEqual([
      ['status', 'Pets'],
      ['visibility', 'public'],
      ['media_ids[]', '201'],
      ['media_ids[]', '202'],
    ]);
    expect(resumed.calls[1]?.headers['idempotency-key']).toBe(KEY);
    expect(second.events).toEqual([
      'step:upload_media',
      `request:GET ${ORIGIN}/api/v1/media/201`,
      'checkpoint',
      'step:create_status',
      'checkpoint',
      `request:POST ${STATUSES}`,
      'checkpoint',
    ]);
    const ready = { m1: { id: '201', ready: true }, m2: { id: '202', ready: true } };
    expect(second.checkpoints.slice(1)).toEqual([
      { media: ready, sentAt: SENT_AT },
      {
        media: ready,
        sentAt: SENT_AT,
        status: { id: '113000000000000001', url: STATUS_URL },
      },
    ]);
  });

  it('posts a text-only status with its language and no media', async () => {
    const http = scriptedHttp([posts()]);
    const item = { ...main('Ahoj svet https://example.org'), language: 'sk-SK' };
    const result = await mastodonRuntime.publish(testPublishContext(http).ctx, input([item]));
    http.assertDone();
    expect(result).toEqual(PUBLISHED);
    expect(form(http.calls[0])).toEqual([
      ['status', 'Ahoj svet https://example.org'],
      ['visibility', 'public'],
      ['language', 'sk'],
    ]);
  });

  it('never repeats finished uploads or an item already posted', async () => {
    const ready = { m1: { id: '201', ready: true } };
    const http = scriptedHttp([posts()]);
    await mastodonRuntime.publish(
      testPublishContext(http, media).ctx,
      input([main('Cat', [cat])], { media: ready }),
    );
    http.assertDone();

    const none = scriptedHttp([]);
    const posted = { media: ready, sentAt: SENT_AT, status: { id: '113000000000000001' } };
    const result = await mastodonRuntime.publish(
      testPublishContext(none, media).ctx,
      input([main('Cat', [cat])], posted),
    );
    none.assertDone();
    expect(result).toEqual({ kind: 'published', remoteId: '113000000000000001' });
  });

  it('sends the same idempotency key on every attempt, derived from destination and position', async () => {
    const keys: (string | undefined)[] = [];
    for (const attemptNo of [1, 2, 7]) {
      const http = scriptedHttp([posts()]);
      await mastodonRuntime.publish(
        testPublishContext(http).ctx,
        input([main('Hi')], {}, attemptNo),
      );
      keys.push(http.calls[0]?.headers['idempotency-key']);
    }
    expect(new Set(keys)).toEqual(new Set([KEY]));
    expect(idempotencyKey('dest-2', 0)).not.toBe(KEY);
    expect(idempotencyKey('dest-1', 1)).not.toBe(KEY);
  });

  it('refuses threads, empty posts and video', async () => {
    const reply: PublishItem = { position: 1, role: 'thread', text: 'Reply', media: [] };
    const video = { ...cat, mime: 'video/mp4' };
    for (const [items, code] of [
      [[main('Root'), reply], 'thread_unsupported'],
      [[main('  ')], 'text_empty'],
      [[main('Clip', [video])], 'media_type_unsupported'],
    ] as const) {
      const http = scriptedHttp([]);
      expect(
        await failureOf(mastodonRuntime.publish(testPublishContext(http).ctx, input(items))),
      ).toEqual({
        kind: 'permanent',
        code,
      });
    }
  });
});

describe('mastodon publish errors', () => {
  async function publishWith(script: ScriptedExchange[], refs: readonly MediaRef[] = []) {
    const http = scriptedHttp(script);
    const error = await failureOf(
      mastodonRuntime.publish(testPublishContext(http, media).ctx, input([main('Hi', refs)])),
    );
    http.assertDone();
    return error;
  }

  it('maps 401 to a revoked token and 422 to a safe permanent code', async () => {
    expect(
      await publishWith([posts({ status: 401, json: { error: 'The access token is invalid' } })]),
    ).toEqual({
      kind: 'auth_revoked',
    });
    expect(
      await publishWith([
        posts({ status: 422, json: { error: 'Validation failed: Text too long' } }),
      ]),
    ).toEqual({ kind: 'permanent', code: 'status_invalid' });
    expect(await publishWith([uploads('201', 422)], [cat])).toEqual({
      kind: 'permanent',
      code: 'media_invalid',
    });
  });

  it('maps 429 to rate_limited at X-RateLimit-Reset, or five minutes without it', async () => {
    const reset = '2026-10-21T12:04:30.000Z';
    expect(
      await publishWith([posts({ status: 429, headers: { 'x-ratelimit-reset': reset } })]),
    ).toMatchObject({ kind: 'rate_limited', scope: 'account' });
    const limited = await publishWith([uploads('201', 429)], [cat]);
    expect(limited.kind === 'rate_limited' && limited.resetAt.toString()).toBe(
      TEST_NOW.add({ minutes: 5 }).toString(),
    );
    const withReset = await publishWith([
      posts({ status: 429, headers: { 'x-ratelimit-reset': reset } }),
    ]);
    expect(withReset.kind === 'rate_limited' && withReset.resetAt.toString()).toBe(
      '2026-10-21T12:04:30Z',
    );
  });

  it('treats 5xx and network errors as transient before the public send and ambiguous after it', async () => {
    expect(await publishWith([uploads('201', 503)], [cat])).toEqual({
      kind: 'transient',
      detail: 'http_503',
    });
    expect(
      await publishWith([{ method: 'POST', url: UPLOAD, error: egressError('timeout') }], [cat]),
    ).toEqual({
      kind: 'transient',
      detail: 'timeout',
    });
    expect(await publishWith([posts({ status: 502 })])).toEqual({
      kind: 'ambiguous',
      detail: 'http_502',
    });
    expect(
      await publishWith([{ method: 'POST', url: STATUSES, error: egressError('timeout') }]),
    ).toEqual({
      kind: 'ambiguous',
      detail: 'timeout',
    });
    expect(await publishWith([posts({ json: { unexpected: true } })])).toMatchObject({
      kind: 'ambiguous',
    });
  });

  it('rejects media the server failed to process', async () => {
    expect(await publishWith([uploads('201', 202), mediaStatus('201', 422)], [cat])).toEqual({
      kind: 'permanent',
      code: 'media_rejected',
    });
  });
});
