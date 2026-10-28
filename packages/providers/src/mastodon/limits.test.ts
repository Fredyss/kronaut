import type { PostTypeSpec } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { accountPostType } from './limits.ts';
import { mastodonManifest } from './manifest.ts';

const post = mastodonManifest.postTypes[0] as PostTypeSpec;
const video = mastodonManifest.postTypes[1] as PostTypeSpec;

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

  it('applies the instance video limits to the video post type', () => {
    const spec = accountPostType(video, {
      instance: {
        maxCharacters: 1000,
        maxMediaAttachments: 4,
        supportedMimeTypes: ['image/jpeg', 'video/mp4'],
        videoSizeLimit: 41_943_040,
        videoFrameRateLimit: 60,
        videoMatrixLimit: 2_073_600,
        descriptionLimit: 900,
      },
    });
    expect(spec.media.video).toEqual({
      mimes: ['video/mp4'],
      maxBytes: 41_943_040,
      minDurationMs: 1,
      maxDurationMs: 900_000,
      maxFrameRate: 60,
      maxPixels: 2_073_600,
    });
    expect(spec.media.maxCount).toBe(1);
    expect(spec.text).toEqual([{ counting: 'mastodon', max: 1000, urlWeight: 23 }]);
    expect(spec.media.altText.maxLength).toBe(900);
  });

  it('falls back to the manifest video limits when the instance omits them', () => {
    const spec = accountPostType(video, { instance: { maxCharacters: 1000 } });
    expect(spec.media.video).toEqual(video.media.video);
    expect(spec.media.maxCount).toBe(1);
  });

  it('leaves no video mime when the instance does not list video/mp4', () => {
    const spec = accountPostType(video, {
      instance: { supportedMimeTypes: ['image/jpeg', 'video/webm'] },
    });
    expect(spec.media.video?.mimes).toEqual([]);
    expect(spec.media.video?.maxBytes).toBe(103_809_024);
  });

  it('does not touch the image limits of post when only video limits are set', () => {
    const spec = accountPostType(post, { instance: { videoSizeLimit: 1 } });
    expect(spec).toEqual(post);
  });
});
