import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder } from '../_kit/testing.ts';
import { pinterestManifest } from './manifest.ts';
import {
  BOARD_ID,
  BOARD_PINS,
  IMAGE,
  json,
  PIN_ID,
  PINS_URL,
  photo,
  run,
  SENT_AT,
} from './testing.ts';

const created = { method: 'POST', url: PINS_URL, status: 201, json: { id: PIN_ID } };
const shots = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    photo({ id: `m${index + 1}`, altText: `Shot ${index + 1}` }),
  );
const carousel = { postType: 'carousel', media: shots(2) };
const data = Buffer.from(IMAGE).toString('base64');

describe('pinterest carousel publish', () => {
  it('creates one Pin with the images as base64 items and the first alt text', async () => {
    const media = [photo({ id: 'm1', altText: 'Shot 1' }), photo({ id: 'm2', mime: 'image/png' })];
    const { result, calls, events, checkpoints } = await run('publish', [created], {
      ...carousel,
      media,
    });
    expect(result).toEqual({
      kind: 'published',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
    assertPublicSendOrder(events, pinterestManifest);
    expect(checkpoints).toEqual([{ sentAt: SENT_AT }]);
    expect(json(calls[0]?.body)).toEqual({
      board_id: BOARD_ID,
      title: 'Autumn table',
      description: 'Oak, linen and late light.',
      link: 'https://shop.example.org/table',
      alt_text: 'Shot 1',
      media_source: {
        source_type: 'multiple_image_base64',
        items: [
          { content_type: 'image/jpeg', data },
          { content_type: 'image/png', data },
        ],
      },
    });
  });

  it('takes up to five images', async () => {
    const { calls } = await run('publish', [created], { ...carousel, media: shots(5) });
    const body = json(calls[0]?.body) as { media_source: { items: unknown[] } };
    expect(body.media_source.items).toHaveLength(5);
  });

  const first = photo({ id: 'm1' });
  const second = photo({ id: 'm2' });
  it.each([
    ['one image', { media: shots(1) }, 'too_few_images'],
    ['six images', { media: shots(6) }, 'too_many_images'],
    [
      'a WebP image',
      { media: [first, { ...second, mime: 'image/webp' }] },
      'media_type_unsupported',
    ],
    [
      'a video',
      { media: [first, { ...second, mime: 'video/mp4', durationMs: 5_000 }] },
      'video_unsupported',
    ],
    ['an image over 8 MB', { media: [first, { ...second, bytes: 8_000_001 }] }, 'image_too_large'],
    [
      'a long alt text',
      { media: [first, { ...second, altText: 'a'.repeat(501) }] },
      'alt_text_too_long',
    ],
    ['no board', { settings: {} }, 'board_missing'],
  ])('refuses %s before sending', async (_name, options, code) => {
    const { error, calls } = await run('publish', [], { ...carousel, ...options });
    expect(error).toEqual({ kind: 'permanent', code });
    expect(calls).toHaveLength(0);
  });
});

describe('pinterest carousel verify', () => {
  it('finds the carousel Pin by the first alt text', async () => {
    const pin = {
      id: PIN_ID,
      created_at: '2026-10-21T12:00:05',
      title: 'Autumn table',
      description: 'Oak, linen and late light.',
      link: 'https://shop.example.org/table',
      alt_text: 'Shot 1',
    };
    const { result } = await run('verify', [{ url: BOARD_PINS, json: { items: [pin] } }], {
      ...carousel,
      state: { sentAt: SENT_AT },
    });
    expect(result).toEqual({
      kind: 'found',
      remoteId: PIN_ID,
      url: `https://www.pinterest.com/pin/${PIN_ID}/`,
    });
  });
});
