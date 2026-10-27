import type { PostTypeSpec } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { codes, comment, FAMILY, GRAM, jpeg, main, mp4, SKY, thread } from './testing.ts';
import { type IssueCode, validate } from './validate.ts';

describe('validate: structure', () => {
  it('reports an unknown post type and stops', () => {
    expect(validate(SKY, 'nope', [])).toStrictEqual([{ code: 'unknown_post_type' }]);
    expect(validate(SKY, 'nope', [comment('x'.repeat(5000))])).toStrictEqual([
      { code: 'unknown_post_type' },
    ]);
  });

  it('reports an unavailable post type and stops', () => {
    expect(validate(SKY, 'retired', [main()])).toStrictEqual([{ code: 'post_type_unavailable' }]);
    expect(validate(SKY, 'retired', [])).toStrictEqual([{ code: 'post_type_unavailable' }]);
  });

  it('reports no items and stops', () => {
    expect(validate(SKY, 'post', [])).toStrictEqual([{ code: 'no_items' }]);
  });

  it.each([
    ['the first item is not main', [thread(), thread()]],
    ['a comment comes first', [comment()]],
    ['a later item is also main', [main(), main()]],
    ['main appears after a thread', [main(), thread(), main()]],
  ])('reports invalid roles when %s and stops', (_label, items) => {
    const withTooLongText = items.map((item) => ({ ...item, text: 'x'.repeat(400) }));
    expect(validate(SKY, 'post', withTooLongText)).toStrictEqual([{ code: 'invalid_item_roles' }]);
  });

  it('accepts main followed by threads and comments', () => {
    expect(validate(SKY, 'post', [main(), thread(), thread(), comment()])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main()])).toStrictEqual([]);
  });

  it('validates reminder post types like any other', () => {
    expect(validate(SKY, 'remind', [main('x'.repeat(10))])).toStrictEqual([]);
    expect(validate(SKY, 'remind', [main('x'.repeat(11))])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'utf16', limit: 10, actual: 11 },
    ]);
  });
});

describe('validate: text', () => {
  it('passes exactly at the grapheme limit and fails one above', () => {
    expect(validate(SKY, 'post', [main('a'.repeat(300))])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main('a'.repeat(301))])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'graphemes', limit: 300, actual: 301 },
    ]);
  });

  it('passes exactly at the byte limit and fails one above', () => {
    const atLimit = FAMILY.repeat(119) + 'a'.repeat(25);
    expect(new TextEncoder().encode(atLimit).length).toBe(3000);
    expect(validate(SKY, 'post', [main(atLimit)])).toStrictEqual([]);
    expect(validate(SKY, 'post', [main(`${atLimit}a`)])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'utf8-bytes', limit: 3000, actual: 3001 },
    ]);
  });

  it('reports every failing limit of a composite in manifest order', () => {
    expect(validate(SKY, 'post', [main(FAMILY.repeat(301))])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'graphemes', limit: 300, actual: 301 },
      { code: 'text_too_long', itemIndex: 0, counting: 'utf8-bytes', limit: 3000, actual: 7525 },
    ]);
  });

  it('reports only the byte limit when graphemes still fit', () => {
    expect(validate(SKY, 'post', [main(FAMILY.repeat(121))])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'utf8-bytes', limit: 3000, actual: 3025 },
    ]);
  });

  it('counts decomposed text as if it were composed', () => {
    const decomposed = 'c\u030c';
    expect(validate(SKY, 'remind', [main(decomposed.repeat(10))])).toStrictEqual([]);
    expect(validate(SKY, 'remind', [main(decomposed.repeat(11))])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'utf16', limit: 10, actual: 11 },
    ]);
  });

  it('checks every item and reports its index', () => {
    const issues = validate(SKY, 'post', [
      main('ok'),
      thread('a'.repeat(301)),
      comment('b'.repeat(302)),
    ]);
    expect(issues).toStrictEqual([
      { code: 'text_too_long', itemIndex: 1, counting: 'graphemes', limit: 300, actual: 301 },
      { code: 'text_too_long', itemIndex: 2, counting: 'graphemes', limit: 300, actual: 302 },
    ]);
  });

  it('uses utf16 counting when the manifest says so', () => {
    expect(validate(GRAM, 'carousel', [main('a'.repeat(2200), [jpeg(), jpeg()])])).toStrictEqual(
      [],
    );
    expect(validate(GRAM, 'carousel', [main('a'.repeat(2201), [jpeg(), jpeg()])])).toStrictEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'utf16', limit: 2200, actual: 2201 },
    ]);
  });
});

describe('validate: ordering', () => {
  it('lists the issues of one media file in rule order', () => {
    const bad = jpeg({
      mime: 'image/png',
      bytes: 9_000_000,
      width: 100,
      height: 1000,
      altText: 'a'.repeat(1001),
    });
    expect(validate(GRAM, 'carousel', [main('x', [bad, jpeg()])])).toStrictEqual([
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 0 },
      { code: 'file_too_large', itemIndex: 0, mediaIndex: 0, limit: 8_000_000, actual: 9_000_000 },
      { code: 'image_too_narrow', itemIndex: 0, mediaIndex: 0, limit: 320, actual: 100 },
      { code: 'aspect_out_of_range', itemIndex: 0, mediaIndex: 0 },
      { code: 'alt_text_too_long', itemIndex: 0, mediaIndex: 0, limit: 1000, actual: 1001 },
    ]);
  });

  it('lists the issues of a video in rule order', () => {
    const bad = mp4({
      mime: 'video/webm',
      width: 100,
      height: 1000,
      durationMs: 1,
      altText: 'x'.repeat(1001),
    });
    expect(codes(validate(GRAM, 'carousel', [main('x', [bad, jpeg()])]))).toEqual([
      'mime_unsupported',
      'aspect_out_of_range',
      'duration_too_short',
      'alt_text_too_long',
    ]);
  });

  it('puts count and mixing issues before per-file issues', () => {
    const issues = validate(SKY, 'gallery', [
      main('x', [jpeg(), jpeg(), jpeg(), jpeg({ mime: 'image/gif' }), mp4()]),
    ]);
    expect(issues).toStrictEqual([
      { code: 'too_many_media', itemIndex: 0, limit: 4, actual: 5 },
      { code: 'mixed_media_unsupported', itemIndex: 0 },
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 3 },
    ]);
  });

  it('never reports both too few and too many', () => {
    expect(codes(validate(GRAM, 'carousel', [main('x', [jpeg()])]))).toEqual(['too_few_media']);
  });

  it('reports all text issues before any media issue', () => {
    const issues = validate(SKY, 'post', [
      main('ok', [jpeg({ bytes: 2_000_000 })]),
      thread('a'.repeat(301)),
      comment('hi', [jpeg()]),
    ]);
    expect(issues).toStrictEqual([
      { code: 'text_too_long', itemIndex: 1, counting: 'graphemes', limit: 300, actual: 301 },
      { code: 'file_too_large', itemIndex: 0, mediaIndex: 0, limit: 1_000_000, actual: 2_000_000 },
      { code: 'media_not_allowed', itemIndex: 2 },
    ]);
  });

  it('reports media issues item by item in order', () => {
    const issues = validate(SKY, 'post', [
      main('x', [jpeg({ mime: 'image/gif' })]),
      thread('x', [jpeg(), jpeg({ bytes: 2_000_000 })]),
    ]);
    expect(issues).toStrictEqual([
      { code: 'mime_unsupported', itemIndex: 0, mediaIndex: 0 },
      { code: 'file_too_large', itemIndex: 1, mediaIndex: 1, limit: 1_000_000, actual: 2_000_000 },
    ]);
  });

  it('is deterministic and does not mutate its input', () => {
    const items = [main('a'.repeat(301), [jpeg({ mime: 'image/gif' })]), thread('b')];
    const snapshot = structuredClone(items);
    const first = validate(SKY, 'post', items);
    const second = validate(SKY, 'post', items);
    expect(second).toStrictEqual(first);
    expect(items).toStrictEqual(snapshot);
  });
});

describe('validate: coverage of every issue code', () => {
  const cases: readonly [IssueCode, () => ReturnType<typeof validate>][] = [
    ['unknown_post_type', () => validate(SKY, 'missing', [main()])],
    ['post_type_unavailable', () => validate(SKY, 'retired', [main()])],
    ['no_items', () => validate(SKY, 'post', [])],
    ['invalid_item_roles', () => validate(SKY, 'post', [thread()])],
    ['text_too_long', () => validate(SKY, 'post', [main('a'.repeat(301))])],
    ['too_few_media', () => validate(GRAM, 'carousel', [main('x', [jpeg()])])],
    [
      'too_many_media',
      () =>
        validate(SKY, 'post', [
          main(
            'x',
            Array.from({ length: 5 }, () => jpeg()),
          ),
        ]),
    ],
    ['media_not_allowed', () => validate(SKY, 'post', [main(), comment('c', [jpeg()])])],
    ['media_kind_unsupported', () => validate(SKY, 'post', [main('x', [mp4()])])],
    ['mixed_media_unsupported', () => validate(SKY, 'gallery', [main('x', [jpeg(), mp4()])])],
    ['mime_unsupported', () => validate(SKY, 'post', [main('x', [jpeg({ mime: 'image/gif' })])])],
    ['file_too_large', () => validate(SKY, 'post', [main('x', [jpeg({ bytes: 1_000_001 })])])],
    [
      'media_metadata_missing',
      () =>
        validate(GRAM, 'wide_px', [main('x', [{ kind: 'image', mime: 'image/jpeg', bytes: 1 }])]),
    ],
    ['image_too_narrow', () => validate(GRAM, 'wide_px', [main('x', [jpeg({ width: 99 })])])],
    [
      'image_too_wide',
      () => validate(GRAM, 'carousel', [main('x', [jpeg({ width: 1441, height: 1441 }), jpeg()])]),
    ],
    [
      'aspect_out_of_range',
      () => validate(GRAM, 'reel', [main('x', [mp4({ width: 100, height: 100 })])]),
    ],
    [
      'duration_too_short',
      () => validate(GRAM, 'reel', [main('x', [mp4({ width: 9, height: 16, durationMs: 1 })])]),
    ],
    [
      'duration_too_long',
      () =>
        validate(GRAM, 'reel', [main('x', [mp4({ width: 9, height: 16, durationMs: 90_001 })])]),
    ],
    ['alt_text_required', () => validate(SKY, 'strict_alt', [main('x', [jpeg()])])],
    [
      'alt_text_too_long',
      () => validate(SKY, 'post', [main('x', [jpeg({ altText: 'a'.repeat(2001) })])]),
    ],
  ];

  it.each(cases)('emits %s', (code, run) => {
    expect(codes(run())).toContain(code);
  });
});

describe('validate: account capabilities', () => {
  it("passes the account's capabilities to the manifest's accountPostType", () => {
    const seen: unknown[] = [];
    const manifest = {
      ...SKY,
      accountPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
        seen.push(capabilities);
        return { ...postType, media: { ...postType.media, maxCount: 1 } };
      },
    };
    const items = [{ ...main(), media: [jpeg(), jpeg()] }];
    expect(codes(validate(manifest, 'post', items, { limit: 1 }))).toStrictEqual([
      'too_many_media',
    ]);
    expect(seen).toStrictEqual([{ limit: 1 }]);
    expect(validate(SKY, 'post', items, { limit: 1 })).toStrictEqual([]);
  });
});
