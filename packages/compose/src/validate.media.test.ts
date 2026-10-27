import { describe, expect, it } from 'vitest';
import { codes, comment, FAMILY, GRAM, jpeg, main, mp4, SKY, thread } from './testing.ts';
import { type DraftMedia, validate } from './validate.ts';

describe('validate: media counts and roles', () => {
  it('rejects media on comment items', () => {
    expect(validate(SKY, 'post', [main(), comment('hi', [jpeg()])])).toStrictEqual([
      { code: 'media_not_allowed', itemIndex: 1 },
    ]);
    expect(
      validate(SKY, 'post', [main(), comment('hi', [jpeg(), mp4(), jpeg({ mime: 'image/gif' })])]),
    ).toStrictEqual([{ code: 'media_not_allowed', itemIndex: 1 }]);
  });

  it('allows media on thread items and validates them like main', () => {
    expect(
      validate(SKY, 'post', [main(), thread('t', [jpeg({ mime: 'image/gif' })])]),
    ).toStrictEqual([{ code: 'mime_unsupported', itemIndex: 1, mediaIndex: 0 }]);
  });

  it('enforces the minimum count with limit and actual', () => {
    expect(validate(GRAM, 'carousel', [main('x', [jpeg()])])).toStrictEqual([
      { code: 'too_few_media', itemIndex: 0, limit: 2, actual: 1 },
    ]);
    expect(validate(GRAM, 'carousel', [main('x')])).toStrictEqual([
      { code: 'too_few_media', itemIndex: 0, limit: 2, actual: 0 },
    ]);
    expect(validate(GRAM, 'carousel', [main('x', [jpeg(), jpeg()])])).toStrictEqual([]);
  });

  it('enforces the maximum count with limit and actual', () => {
    const four = [jpeg(), jpeg(), jpeg(), jpeg()];
    expect(validate(SKY, 'post', [main('x', four)])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main('x', [...four, jpeg()])])).toStrictEqual([
      { code: 'too_many_media', itemIndex: 0, limit: 4, actual: 5 },
    ]);
    const ten = Array.from({ length: 10 }, () => jpeg());
    expect(validate(GRAM, 'carousel', [main('x', ten)])).toStrictEqual([]);
    expect(validate(GRAM, 'carousel', [main('x', [...ten, jpeg()])])).toStrictEqual([
      { code: 'too_many_media', itemIndex: 0, limit: 10, actual: 11 },
    ]);
  });

  it('treats media on a text-only post type as too many', () => {
    expect(validate(SKY, 'remind', [main('x', [jpeg()])])).toStrictEqual([
      { code: 'too_many_media', itemIndex: 0, limit: 0, actual: 1 },
      { code: 'media_kind_unsupported', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('rejects mixing images and videos when the post type forbids it', () => {
    expect(
      validate(SKY, 'gallery', [main('x', [jpeg({ width: 1, height: 1 }), mp4()])]),
    ).toStrictEqual([{ code: 'mixed_media_unsupported', itemIndex: 0 }]);
    expect(validate(SKY, 'gallery', [main('x', [mp4()])])).toStrictEqual([]);
    expect(validate(SKY, 'gallery', [main('x', [jpeg(), jpeg()])])).toStrictEqual([]);
  });

  it('allows mixing images and videos when the post type permits it', () => {
    expect(validate(GRAM, 'carousel', [main('x', [jpeg(), mp4()])])).toStrictEqual([]);
  });
});

describe('validate: single media files', () => {
  it('reports an unsupported kind and skips every other check for that media', () => {
    const video = mp4({ mime: 'video/quicktime', bytes: 999_999_999_999, durationMs: 1 });
    expect(validate(SKY, 'post', [main('x', [video])])).toStrictEqual([
      { code: 'media_kind_unsupported', itemIndex: 0, mediaIndex: 0 },
    ]);
    const image = jpeg();
    expect(validate(GRAM, 'reel', [main('x', [image])])).toStrictEqual([
      { code: 'media_kind_unsupported', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('keeps checking the other media after an unsupported one', () => {
    expect(validate(SKY, 'post', [main('x', [mp4(), jpeg({ mime: 'image/gif' })])])).toStrictEqual([
      { code: 'mixed_media_unsupported', itemIndex: 0 },
      { code: 'media_kind_unsupported', itemIndex: 0, mediaIndex: 0 },
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 1 },
    ]);
  });

  it('checks the MIME type against the list for its kind', () => {
    expect(validate(SKY, 'post', [main('x', [jpeg({ mime: 'image/png' })])])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main('x', [jpeg({ mime: 'image/gif' })])])).toStrictEqual([
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 0 },
    ]);
    expect(validate(SKY, 'post', [main('x', [jpeg({ mime: 'IMAGE/JPEG' })])])).toStrictEqual([
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('passes exactly at the byte limit and fails one above', () => {
    expect(validate(SKY, 'post', [main('x', [jpeg({ bytes: 1_000_000 })])])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main('x', [jpeg({ bytes: 1_000_001 })])])).toStrictEqual([
      { code: 'file_too_large', itemIndex: 0, mediaIndex: 0, limit: 1_000_000, actual: 1_000_001 },
    ]);
  });

  it('reports the media index of the failing file', () => {
    expect(
      validate(SKY, 'post', [main('x', [jpeg(), jpeg(), jpeg({ bytes: 2_000_000 })])]),
    ).toStrictEqual([
      { code: 'file_too_large', itemIndex: 0, mediaIndex: 2, limit: 1_000_000, actual: 2_000_000 },
    ]);
  });

  it('does not require dimensions when the limits do not constrain them', () => {
    const bare: DraftMedia = { kind: 'image', mime: 'image/jpeg', bytes: 10 };
    expect(validate(SKY, 'post', [main('x', [bare])])).toStrictEqual([]);
  });
});

describe('validate: image dimensions', () => {
  const carousel = (media: DraftMedia) => validate(GRAM, 'carousel', [main('x', [media, jpeg()])]);

  it('reports missing metadata and skips the dimension checks', () => {
    const bare: DraftMedia = { kind: 'image', mime: 'image/jpeg', bytes: 10 };
    expect(carousel(bare)).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('reports missing metadata when only one dimension is present but still checks it', () => {
    const widthOnly: DraftMedia = { kind: 'image', mime: 'image/jpeg', bytes: 10, width: 100 };
    expect(carousel(widthOnly)).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
      { code: 'image_too_narrow', itemIndex: 0, mediaIndex: 0, limit: 320, actual: 100 },
    ]);
    const heightOnly: DraftMedia = { kind: 'image', mime: 'image/jpeg', bytes: 10, height: 500 };
    expect(carousel(heightOnly)).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('requires dimensions when only a minimum width is constrained', () => {
    const bare: DraftMedia = { kind: 'image', mime: 'image/jpeg', bytes: 10 };
    expect(validate(GRAM, 'wide_px', [main('x', [bare])])).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('passes exactly at the minimum width and fails one below', () => {
    expect(carousel(jpeg({ width: 320, height: 400 }))).toStrictEqual([]);
    expect(carousel(jpeg({ width: 319, height: 398 }))).toStrictEqual([
      { code: 'image_too_narrow', itemIndex: 0, mediaIndex: 0, limit: 320, actual: 319 },
    ]);
  });

  it('passes exactly at the maximum width and fails one above', () => {
    expect(carousel(jpeg({ width: 1440, height: 1440 }))).toStrictEqual([]);
    expect(carousel(jpeg({ width: 1441, height: 1441 }))).toStrictEqual([
      { code: 'image_too_wide', itemIndex: 0, mediaIndex: 0, limit: 1440, actual: 1441 },
    ]);
  });

  it('passes exactly at the 4:5 lower aspect bound and fails just below', () => {
    expect(carousel(jpeg({ width: 800, height: 1000 }))).toStrictEqual([]);
    expect(carousel(jpeg({ width: 799, height: 1000 }))).toStrictEqual([
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('passes exactly at the 1.91:1 upper aspect bound and fails just above', () => {
    expect(carousel(jpeg({ width: 1337, height: 700 }))).toStrictEqual([]);
    expect(carousel(jpeg({ width: 1338, height: 700 }))).toStrictEqual([
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('accepts a square image inside the range', () => {
    expect(carousel(jpeg({ width: 1080, height: 1080 }))).toStrictEqual([]);
  });

  it('checks a single aspect bound when only one is defined', () => {
    const wide = (width: number, height: number) =>
      validate(GRAM, 'wide_only', [main('x', [jpeg({ width, height })])]);
    expect(wide(2000, 1000)).toStrictEqual([]);
    expect(wide(2001, 1000)).toStrictEqual([
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
    ]);
    expect(wide(1, 100_000)).toStrictEqual([]);
    const tall = (width: number, height: number) =>
      validate(GRAM, 'tall_only', [main('x', [jpeg({ width, height })])]);
    expect(tall(1000, 2000)).toStrictEqual([]);
    expect(tall(999, 2000)).toStrictEqual([
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
    ]);
    expect(tall(100_000, 1)).toStrictEqual([]);
  });

  it('compares aspect ratios exactly with integers, without rounding', () => {
    const exact = (width: number, height: number) =>
      validate(GRAM, 'reel', [main('x', [mp4({ width, height })])]);
    expect(exact(9_000_000, 16_000_000)).toStrictEqual([]);
    expect(codes(exact(9_000_001, 16_000_000))).toEqual(['aspect_out_of_range']);
    expect(codes(exact(8_999_999, 16_000_000))).toEqual(['aspect_out_of_range']);
  });
});

describe('validate: video', () => {
  const reel = (media: DraftMedia) => validate(GRAM, 'reel', [main('x', [media])]);

  it('passes a 9:16 video inside the duration range', () => {
    expect(reel(mp4({ width: 1080, height: 1920, durationMs: 15_000 }))).toStrictEqual([]);
  });

  it('applies the aspect range to videos', () => {
    expect(reel(mp4({ width: 1080, height: 1080 }))).toStrictEqual([
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('passes exactly at the minimum duration and fails one below', () => {
    expect(reel(mp4({ width: 1080, height: 1920, durationMs: 3000 }))).toStrictEqual([]);
    expect(reel(mp4({ width: 1080, height: 1920, durationMs: 2999 }))).toStrictEqual([
      { code: 'duration_too_short', itemIndex: 0, mediaIndex: 0, limit: 3000, actual: 2999 },
    ]);
  });

  it('passes exactly at the maximum duration and fails one above', () => {
    expect(reel(mp4({ width: 1080, height: 1920, durationMs: 90_000 }))).toStrictEqual([]);
    expect(reel(mp4({ width: 1080, height: 1920, durationMs: 90_001 }))).toStrictEqual([
      { code: 'duration_too_long', itemIndex: 0, mediaIndex: 0, limit: 90_000, actual: 90_001 },
    ]);
  });

  it('reports a missing duration', () => {
    const noDuration: DraftMedia = {
      kind: 'video',
      mime: 'video/mp4',
      bytes: 10,
      width: 1080,
      height: 1920,
    };
    expect(reel(noDuration)).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('reports missing dimensions when the video limits define an aspect range', () => {
    const noDimensions: DraftMedia = {
      kind: 'video',
      mime: 'video/mp4',
      bytes: 10,
      durationMs: 1000,
    };
    expect(reel(noDimensions)).toStrictEqual([
      { code: 'media_metadata_missing', itemIndex: 0, mediaIndex: 0 },
      { code: 'duration_too_short', itemIndex: 0, mediaIndex: 0, limit: 3000, actual: 1000 },
    ]);
  });

  it('does not need dimensions when the video limits define no aspect range', () => {
    const noDimensions: DraftMedia = {
      kind: 'video',
      mime: 'video/mp4',
      bytes: 10,
      durationMs: 5000,
    };
    expect(validate(SKY, 'gallery', [main('x', [noDimensions])])).toStrictEqual([]);
  });

  it('checks mime and size for videos too', () => {
    expect(
      reel(mp4({ width: 1080, height: 1920, mime: 'video/webm', bytes: 2_000_000_000 })),
    ).toStrictEqual([
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 0 },
      {
        code: 'file_too_large',
        itemIndex: 0,
        mediaIndex: 0,
        limit: 1_000_000_000,
        actual: 2_000_000_000,
      },
    ]);
  });
});

describe('validate: alt text', () => {
  const strict = (media: DraftMedia) => validate(SKY, 'strict_alt', [main('x', [media])]);

  it('requires alt text when the post type says so', () => {
    expect(strict(jpeg({ altText: 'A dog' }))).toStrictEqual([]);
    expect(strict(jpeg())).toStrictEqual([
      { code: 'alt_text_required', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it.each(['', ' ', '   ', '\n\t', '  '])('treats %j as blank', (altText) => {
    expect(strict(jpeg({ altText }))).toStrictEqual([
      { code: 'alt_text_required', itemIndex: 0, mediaIndex: 0 },
    ]);
  });

  it('does not require alt text otherwise', () => {
    expect(validate(SKY, 'post', [main('x', [jpeg()])])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main('x', [jpeg({ altText: '' })])])).toStrictEqual([]);
  });

  it('passes exactly at the alt text limit and fails one above', () => {
    expect(validate(SKY, 'post', [main('x', [jpeg({ altText: 'a'.repeat(2000) })])])).toStrictEqual(
      [],
    );
    expect(validate(SKY, 'post', [main('x', [jpeg({ altText: 'a'.repeat(2001) })])])).toStrictEqual(
      [{ code: 'alt_text_too_long', itemIndex: 0, mediaIndex: 0, limit: 2000, actual: 2001 }],
    );
  });

  it('counts alt text in graphemes, not UTF-16 units or bytes', () => {
    const altText = FAMILY.repeat(2000);
    expect(validate(SKY, 'post', [main('x', [jpeg({ altText })])])).toStrictEqual([]);
    expect(
      codes(validate(SKY, 'post', [main('x', [jpeg({ altText: altText + FAMILY })])])),
    ).toEqual(['alt_text_too_long']);
  });

  it('ignores alt text when the post type does not support it', () => {
    expect(
      validate(GRAM, 'reel', [main('x', [mp4({ width: 1080, height: 1920, altText: 'a dog' })])]),
    ).toStrictEqual([]);
  });
});
