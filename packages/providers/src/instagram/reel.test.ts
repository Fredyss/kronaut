import type { MediaRef, ProviderState } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { instagramManifest } from './manifest.ts';
import { instagramRuntime } from './runtime.ts';
import {
  createdAs,
  failureOf,
  form,
  graphError,
  input,
  MEDIA,
  main,
  PERMALINK,
  permalink,
  publishes,
  quota,
  RECENT,
  SENT_AT,
  status,
} from './testing.ts';

const clip: MediaRef = {
  id: 'v1',
  sha256: 'b'.repeat(64),
  mime: 'video/mp4',
  bytes: 50_000_000,
  width: 1080,
  height: 1920,
  durationMs: 30_000,
  altText: 'A cat on a skateboard',
  aiGenerated: false,
};
const media = {
  v1: { url: 'https://media.example.org/v1?sig=s1', bytes: new Uint8Array([1]) },
};

const reel = (state: ProviderState = {}, refs: readonly MediaRef[] = [clip]) =>
  input('reel', [main('Skate #cats', refs)], state);

async function rejection(ref: MediaRef) {
  const http = scriptedHttp([]);
  const { ctx, checkpoints } = testPublishContext(http, media);
  const error = await failureOf(instagramRuntime.publish(ctx, reel({}, [ref])));
  expect(http.calls).toHaveLength(0);
  expect(checkpoints).toHaveLength(0);
  return error;
}

describe('instagram reel', () => {
  it('declares a single-video post type after carousel', () => {
    expect(instagramManifest.postTypes.map((type) => type.id)).toEqual([
      'image',
      'carousel',
      'reel',
    ]);
    expect(instagramManifest.postTypes.find((type) => type.id === 'reel')).toEqual({
      id: 'reel',
      delivery: 'api',
      steps: [
        { id: 'create_container', effect: 'private' },
        { id: 'publish_container', effect: 'public' },
      ],
      text: [{ counting: 'utf16', max: 2_200 }],
      media: {
        minCount: 1,
        maxCount: 1,
        video: {
          mimes: ['video/mp4'],
          maxBytes: 300_000_000,
          minDurationMs: 3_000,
          maxDurationMs: 900_000,
          minAspect: { width: 1, height: 100 },
          maxAspect: { width: 10, height: 1 },
        },
        mixed: false,
        altText: { supported: false, required: false, maxLength: 0 },
        aiLabel: true,
      },
      async: { pollIntervalMs: 60_000, giveUpAfterMs: 1_200_000 },
    });
  });

  it('sends a REELS container shared to feed without alt text, then waits 60 s', async () => {
    const http = scriptedHttp([
      createdAs('17900000000000021'),
      status('17900000000000021', 'IN_PROGRESS'),
    ]);
    const { ctx, checkpoints, events } = testPublishContext(http, media);
    const longAlt = { ...clip, altText: 'x'.repeat(5_000), aiGenerated: true };
    expect(await instagramRuntime.publish(ctx, reel({}, [longAlt]))).toEqual({
      kind: 'pending',
      pollAfterMs: 60_000,
    });
    http.assertDone();
    expect(form(http.calls[0])).toEqual({
      media_type: 'REELS',
      video_url: media.v1.url,
      share_to_feed: 'true',
      caption: 'Skate #cats',
      is_ai_generated: 'true',
    });
    expect(checkpoints).toEqual([{ container: '17900000000000021' }]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual(['step:create_container']);
  });

  it('rejects refs that are not a reel-sized video before any network call', async () => {
    const jpeg: MediaRef = { ...clip, mime: 'image/jpeg', bytes: 3 };
    const { durationMs: _, ...still } = clip;
    for (const [ref, code] of [
      [jpeg, 'video_required'],
      [still, 'video_required'],
      [{ ...clip, mime: 'video/quicktime' }, 'video_required'],
      [{ ...clip, bytes: 300_000_001 }, 'video_too_large'],
      [{ ...clip, durationMs: 2_999 }, 'video_too_short'],
      [{ ...clip, durationMs: 900_001 }, 'video_too_long'],
      [{ ...clip, width: 1, height: 101 }, 'aspect_ratio_unsupported'],
      [{ ...clip, width: 1001, height: 100 }, 'aspect_ratio_unsupported'],
    ] as const) {
      expect(await rejection(ref)).toEqual({ kind: 'permanent', code });
    }
    expect(
      await failureOf(
        instagramRuntime.publish(
          testPublishContext(scriptedHttp([]), media).ctx,
          input('image', [main('x', [clip])]),
        ),
      ),
    ).toEqual({ kind: 'permanent', code: 'video_unsupported' });
  });

  it('recreates a container after upload error 2207053 and fails 2207026 as a format error', async () => {
    const run = async (state: ProviderState, exchanges: readonly ScriptedExchange[]) => {
      const http = scriptedHttp(exchanges);
      const context = testPublishContext(http, media);
      const outcome = await instagramRuntime
        .publish(context.ctx, reel(state))
        .catch((error: unknown) => failureOf(Promise.reject(error)));
      http.assertDone();
      return { outcome, checkpoints: context.checkpoints };
    };
    const fresh = await run({}, [
      createdAs('17900000000000021'),
      status('17900000000000021', 'ERROR', 'Error: 2207053'),
    ]);
    expect(fresh.outcome).toMatchObject({ kind: 'transient' });
    expect(fresh.checkpoints.at(-1)).toEqual({});

    const stale = await run({ container: '17900000000000021' }, [
      status('17900000000000021', 'ERROR', 'Error: 2207053'),
      createdAs('17900000000000022'),
      status('17900000000000022', 'IN_PROGRESS'),
    ]);
    expect(stale.outcome).toEqual({ kind: 'pending', pollAfterMs: 60_000 });
    expect(stale.checkpoints).toEqual([{}, { container: '17900000000000022' }]);

    const refused = await run({}, [{ ...createdAs('x'), ...graphError(-1, 2207053) }]);
    expect(refused.outcome).toMatchObject({ kind: 'transient' });

    const format = await run({ container: '17900000000000021' }, [
      status('17900000000000021', 'ERROR', 'Error: 2207026'),
    ]);
    expect(format.outcome).toEqual({
      kind: 'permanent',
      code: 'video_format_unsupported',
      detail: '2207026',
    });
    const called = await run({}, [{ ...createdAs('x'), ...graphError(352, 2207026) }]);
    expect(called.outcome).toEqual({
      kind: 'permanent',
      code: 'video_format_unsupported',
      detail: '352/2207026',
    });
  });

  it('publishes a finished reel and recovers only a REELS candidate', async () => {
    const http = scriptedHttp([
      status('17900000000000021', 'FINISHED'),
      quota(0),
      publishes(),
      permalink,
    ]);
    const { ctx } = testPublishContext(http, media);
    expect(await instagramRuntime.publish(ctx, reel({ container: '17900000000000021' }))).toEqual({
      kind: 'published',
      remoteId: '18000000000000009',
      url: PERMALINK,
    });
    http.assertDone();

    const feedVideo = {
      id: '18000000000000005',
      timestamp: '2026-10-21T12:00:03+0000',
      media_type: 'VIDEO',
      media_product_type: 'FEED',
    };
    const ours = {
      ...feedVideo,
      id: '18000000000000007',
      timestamp: '2026-10-21T12:00:04+0000',
      media_product_type: 'REELS',
      permalink: PERMALINK,
    };
    const recovered = scriptedHttp([
      status('17900000000000021', 'PUBLISHED'),
      { url: RECENT, json: { data: [ours, feedVideo] } },
    ]);
    const published = reel({ container: '17900000000000021', sentAt: SENT_AT });
    expect(
      await instagramRuntime.publish(testPublishContext(recovered, media).ctx, published),
    ).toEqual({ kind: 'published', remoteId: '18000000000000007', url: PERMALINK });
    recovered.assertDone();
    expect(recovered.calls.map((call) => call.url)).not.toContain(MEDIA);
  });
});
