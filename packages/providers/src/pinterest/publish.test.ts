import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError, statusTable, TEST_NOW } from '../_kit/testing.ts';
import { failureFromBody } from './errors.ts';
import { pinterestManifest } from './manifest.ts';
import {
  BOARD_ID,
  BOARD_PINS,
  IMAGE,
  json,
  PIN_ID,
  PINS_URL,
  pinterestError,
  run,
  SENT_AT,
  TOKEN,
} from './testing.ts';

const created = { method: 'POST', url: PINS_URL, status: 201, json: { id: PIN_ID } };

describe('pinterest publish', () => {
  it('creates the Pin with the image as base64 after the public checkpoint', async () => {
    const { result, calls, events, checkpoints } = await run('publish', [created]);
    expect(result).toEqual({
      kind: 'published',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
    assertPublicSendOrder(events, pinterestManifest);
    expect(checkpoints).toEqual([{ sentAt: SENT_AT }]);
    expect(calls[0]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    });
    expect(json(calls[0]?.body)).toEqual({
      board_id: BOARD_ID,
      title: 'Autumn table',
      description: 'Oak, linen and late light.',
      link: 'https://shop.example.org/table',
      alt_text: 'A wooden table',
      media_source: {
        source_type: 'image_base64',
        content_type: 'image/jpeg',
        data: Buffer.from(IMAGE).toString('base64'),
      },
    });
  });

  it('leaves out empty optional fields', async () => {
    const { calls } = await run('publish', [{ ...created, status: 200 }], {
      settings: { boardId: BOARD_ID },
      text: '',
      ref: { altText: '' },
    });
    expect(Object.keys(json(calls[0]?.body) as object)).toEqual(['board_id', 'media_source']);
  });

  it.each([
    ['no board', { settings: {} }, 'board_missing'],
    ['no image', { media: [] }, 'image_required'],
    ['a video', { ref: { mime: 'video/mp4', durationMs: 3_000 } }, 'video_unsupported'],
    ['a WebP image', { ref: { mime: 'image/webp' } }, 'media_type_unsupported'],
    ['an image over 8 MB', { ref: { bytes: 8_000_001 } }, 'image_too_large'],
    ['alt text over 500', { ref: { altText: 'a'.repeat(501) } }, 'alt_text_too_long'],
    ['a description over 800', { text: 'a'.repeat(801) }, 'text_too_long'],
  ])('refuses %s before sending', async (_name, options, code) => {
    const { error, calls } = await run('publish', [], options);
    expect(error).toEqual({ kind: 'permanent', code });
    expect(calls).toHaveLength(0);
  });

  it('refuses a post type it does not know', async () => {
    const { error, calls } = await run('publish', [], { postType: 'story' });
    expect(error).toEqual({ kind: 'permanent', code: 'post_type_unsupported' });
    expect(calls).toHaveLength(0);
  });

  it.each([
    [404, { code: 404 }, { kind: 'permanent', code: 'board_gone', detail: '404/404' }],
    [
      403,
      { code: 403, message: 'PINNER_DATA_ACCESS_DENIED' },
      { kind: 'permanent', code: 'business_account_required', detail: 'PINNER_DATA_ACCESS_DENIED' },
    ],
    [401, { code: 2 }, { kind: 'ambiguous', detail: '401/2' }],
  ])('maps a %i on create', async (status, body, expected) => {
    const { error } = await run('publish', [{ method: 'POST', url: PINS_URL, status, json: body }]);
    expect(error).toEqual(expected);
  });

  it('never puts the token into a failure', async () => {
    const echoed = { method: 'POST', url: PINS_URL, ...pinterestError(500, 1, `bad ${TOKEN}`) };
    const lost = { method: 'POST', url: PINS_URL, error: egressError('timeout') };
    for (const exchange of [echoed, lost]) {
      const { error } = await run('publish', [exchange]);
      expect(error?.kind).toBe('ambiguous');
      expect(JSON.stringify(error)).not.toContain(TOKEN);
    }
  });
});

describe('pinterest errors', () => {
  it('maps statuses by step effect', () => {
    const table = statusTable(
      (status, effect) =>
        failureFromBody({ status, headers: new Headers() }, '', { effect, now: TEST_NOW }).error,
    );
    expect(table['400 public']).toBe(
      JSON.stringify({ kind: 'permanent', code: 'invalid_request', detail: 'http_400' }),
    );
    expect(table['401 private']).toBe(JSON.stringify({ kind: 'auth_expired' }));
    expect(table['403 public']).toBe(
      JSON.stringify({ kind: 'permanent', code: 'forbidden', detail: 'http_403' }),
    );
    expect(table['404 private']).toBe(
      JSON.stringify({ kind: 'permanent', code: 'unexpected_status', detail: 'http_404' }),
    );
    expect(table['500 public']).toBe(JSON.stringify({ kind: 'ambiguous', detail: 'http_500' }));
    expect(table['503 private']).toBe(JSON.stringify({ kind: 'transient', detail: 'http_503' }));
  });

  it('waits for the reset header on a 429', () => {
    const headers = new Headers({ 'x-ratelimit-reset': '42' });
    const { error } = failureFromBody({ status: 429, headers }, '', {
      effect: 'public',
      now: TEST_NOW,
    });
    expect(error).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ seconds: 42 }),
    });
  });
});

const pin = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  created_at: '2026-10-21T12:00:05',
  title: 'Autumn table',
  description: 'Oak, linen and late light.',
  link: 'https://shop.example.org/table',
  alt_text: 'A wooden table',
  ...extra,
});

describe('pinterest verify', () => {
  const sent = { state: { sentAt: SENT_AT } };

  it('claims the one matching Pin on the board', async () => {
    const items = [
      pin(PIN_ID),
      pin('1', { title: 'Other' }),
      pin('2', { created_at: '2026-10-20T08:00:00Z' }),
    ];
    const { result, calls } = await run('verify', [{ url: BOARD_PINS, json: { items } }], sent);
    expect(result).toEqual({
      kind: 'found',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
    expect(calls[0]?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it.each([
    ['no match', []],
    ['two matches', [pin('1'), pin('2')]],
    ['another alt text', [pin('1', { alt_text: 'A chair' })]],
    ['a Pin from the second before the send', [pin('1', { created_at: '2026-10-21T11:59:59' })]],
  ])('cannot tell with %s', async (_name, items) => {
    const { result } = await run('verify', [{ url: BOARD_PINS, json: { items } }], sent);
    expect(result).toEqual({ kind: 'inconclusive' });
  });

  it('never claims a Pin for a post without title, text and link', async () => {
    const { result, calls } = await run('verify', [], {
      ...sent,
      settings: { boardId: BOARD_ID },
      text: '',
    });
    expect(result).toEqual({ kind: 'inconclusive' });
    expect(calls).toEqual([]);
  });

  it('cannot tell without a send time or when the read fails', async () => {
    expect((await run('verify', [])).result).toEqual({ kind: 'inconclusive' });
    const failed = { url: BOARD_PINS, ...pinterestError(500, 1) };
    expect((await run('verify', [failed], sent)).result).toEqual({ kind: 'inconclusive' });
  });
});
