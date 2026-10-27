import type { PostTypeSpec } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { accountPostType } from './limits.ts';
import { mastodonManifest } from './manifest.ts';

const post = mastodonManifest.postTypes[0] as PostTypeSpec;

describe('mastodon account limits', () => {
  it('keeps the documented defaults without capabilities', () => {
    for (const capabilities of [undefined, {}, { instance: 'nope' }, { instance: {} }]) {
      expect(accountPostType(post, capabilities)).toEqual(post);
    }
    expect(post.text).toEqual([{ counting: 'mastodon', max: 500, urlWeight: 23 }]);
    expect(post.media.maxCount).toBe(4);
    expect(post.media.image?.maxBytes).toBe(16_777_216);
    expect(post.media.image?.mimes).not.toContain('image/gif');
  });

  it("applies the server's limits over the defaults", () => {
    const spec = accountPostType(post, {
      instance: {
        maxCharacters: 1000,
        maxMediaAttachments: 2,
        charactersReservedPerUrl: 30,
        supportedMimeTypes: ['image/jpeg', 'image/gif', 'video/mp4', 'image/webp'],
        imageSizeLimit: 8_388_608,
        descriptionLimit: 900,
      },
      fetchedAt: '2026-10-26T12:00:00Z',
    });
    expect(spec.text).toEqual([{ counting: 'mastodon', max: 1000, urlWeight: 30 }]);
    expect(spec.media.maxCount).toBe(2);
    expect(spec.media.image).toEqual({ mimes: ['image/jpeg', 'image/webp'], maxBytes: 8_388_608 });
    expect(spec.media.altText.maxLength).toBe(900);
  });

  it('ignores malformed values one by one', () => {
    const spec = accountPostType(post, {
      instance: { maxCharacters: -1, maxMediaAttachments: 2.5, imageSizeLimit: 'big' },
    });
    expect(spec).toEqual(post);
  });
});
