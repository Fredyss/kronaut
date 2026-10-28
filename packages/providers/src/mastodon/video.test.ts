import type { MediaRef, ProviderState } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { mastodonManifest } from './manifest.ts';
import { mastodonRuntime } from './runtime.ts';
import {
  cat,
  clip,
  failureOf,
  form,
  input,
  main,
  mediaStatus,
  multipartText,
  ORIGIN,
  PUBLISHED,
  posts,
  uploads,
} from './testing.ts';

const media = {
  v1: { url: 'https://media.example.org/v1', bytes: new Uint8Array([1, 2, 3]) },
  v2: { url: 'https://media.example.org/v2', bytes: new Uint8Array([4, 5, 6]) },
};

const video = (state: ProviderState = {}, text = 'Skate', refs: readonly MediaRef[] = [clip]) =>
  input([main(text, refs)], state, 1, 'video');

async function rejection(refs: readonly MediaRef[], postType = 'video') {
  const http = scriptedHttp([]);
  const { ctx, checkpoints } = testPublishContext(http, { ...media, m1: media.v1 });
  const error = await failureOf(
    mastodonRuntime.publish(ctx, input([main('Skate', refs)], {}, 1, postType)),
  );
  expect(http.calls).toHaveLength(0);
  expect(checkpoints).toHaveLength(0);
  return error;
}

describe('mastodon video', () => {
  it('declares a single-video post type after post', () => {
    expect(mastodonManifest.postTypes.map((type) => type.id)).toEqual(['post', 'video']);
    const spec = mastodonManifest.postTypes.find((type) => type.id === 'video');
    expect(spec?.media.minCount).toBe(1);
    expect(spec?.media.maxCount).toBe(1);
    expect(spec?.media.video?.mimes).toEqual(['video/mp4']);
    expect(spec?.async).toEqual(mastodonManifest.postTypes[0]?.async);
  });

  it('uploads an mp4 with the alt text as description', async () => {
    const http = scriptedHttp([uploads('301', 202), mediaStatus('301', 206)]);
    const { ctx, checkpoints } = testPublishContext(http, media);
    const outcome = await mastodonRuntime.publish(ctx, video());
    http.assertDone();
    expect(outcome).toEqual({ kind: 'pending', pollAfterMs: 5_000 });
    const body = multipartText(http.calls[0]);
    expect(body).toContain('name="description"\r\n\r\nA cat on a skateboard\r\n');
    expect(body).toContain('name="file"; filename="upload.mp4"\r\nContent-Type: video/mp4');
    expect(checkpoints.at(-1)).toEqual({ media: { v1: { id: '301', ready: false } } });
  });

  it('omits the description when the alt text is empty or missing', async () => {
    const { altText: _, ...noAlt } = clip;
    for (const ref of [{ ...clip, altText: '' }, noAlt]) {
      const http = scriptedHttp([uploads('301', 202), mediaStatus('301', 206)]);
      await mastodonRuntime.publish(testPublishContext(http, media).ctx, video({}, 'Skate', [ref]));
      expect(multipartText(http.calls[0])).not.toContain('name="description"');
    }
  });

  it('polls through 206 to 200, then posts with the media id and publishes its url', async () => {
    const state = { media: { v1: { id: '301', ready: false } } };
    const waiting = scriptedHttp([mediaStatus('301', 206)]);
    const first = await mastodonRuntime.publish(
      testPublishContext(waiting, media).ctx,
      video(state),
    );
    waiting.assertDone();
    expect(first).toEqual({ kind: 'pending', pollAfterMs: 5_000 });

    const http = scriptedHttp([mediaStatus('301', 200), posts()]);
    const outcome = await mastodonRuntime.publish(
      testPublishContext(http, media).ctx,
      video(state),
    );
    http.assertDone();
    expect(outcome).toEqual(PUBLISHED);
    expect(http.calls[1]?.url).toBe(`${ORIGIN}/api/v1/statuses`);
    expect(form(http.calls[1])).toEqual([
      ['status', 'Skate'],
      ['visibility', 'public'],
      ['media_ids[]', '301'],
    ]);
  });

  it('posts a video without text', async () => {
    const state = { media: { v1: { id: '301', ready: true } } };
    const http = scriptedHttp([posts()]);
    const outcome = await mastodonRuntime.publish(
      testPublishContext(http, media).ctx,
      video(state, ''),
    );
    http.assertDone();
    expect(outcome).toEqual(PUBLISHED);
    expect(form(http.calls[0])).toContainEqual(['media_ids[]', '301']);
  });

  it('fails permanently when the server rejects the processed video', async () => {
    const http = scriptedHttp([mediaStatus('301', 422)]);
    const error = await failureOf(
      mastodonRuntime.publish(
        testPublishContext(http, media).ctx,
        video({ media: { v1: { id: '301', ready: false } } }),
      ),
    );
    http.assertDone();
    expect(error).toEqual({ kind: 'permanent', code: 'media_rejected' });
  });

  it('rejects unsuitable media before any network call', async () => {
    const permanent = (code: string) => ({ kind: 'permanent', code });
    expect(await rejection([])).toEqual(permanent('video_required'));
    expect(await rejection([clip, { ...clip, id: 'v2' }])).toEqual(permanent('video_required'));
    expect(await rejection([cat])).toEqual(permanent('media_type_unsupported'));
    expect(await rejection([{ ...clip, mime: 'video/quicktime' }])).toEqual(
      permanent('media_type_unsupported'),
    );
    expect(await rejection([clip], 'post')).toEqual(permanent('media_type_unsupported'));
  });
});
