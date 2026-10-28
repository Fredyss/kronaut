import type { MediaRef, ProviderState } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { threadsManifest } from './manifest.ts';
import { threadsRuntime } from './runtime.ts';
import {
  CONTAINER,
  createdAs,
  failureOf,
  form,
  input,
  main,
  PERMALINK,
  POST_ID,
  permalink,
  publishes,
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
  v2: { url: 'https://media.example.org/v2?sig=s2', bytes: new Uint8Array([2]) },
};

const video = (state: ProviderState = {}, text = 'Skate', refs: readonly MediaRef[] = [clip]) =>
  input([main(text, refs)], state, 'video');

async function run(state: ProviderState, exchanges: readonly ScriptedExchange[], text = 'Skate') {
  const http = scriptedHttp(exchanges);
  const context = testPublishContext(http, media);
  const outcome = await threadsRuntime
    .publish(context.ctx, video(state, text))
    .catch((error: unknown) => failureOf(Promise.reject(error)));
  http.assertDone();
  return { outcome, http, ...context };
}

async function rejection(refs: readonly MediaRef[]) {
  const http = scriptedHttp([]);
  const { ctx, checkpoints } = testPublishContext(http, media);
  const error = await failureOf(threadsRuntime.publish(ctx, video({}, 'Skate', refs)));
  expect(http.calls).toHaveLength(0);
  expect(checkpoints).toHaveLength(0);
  return error;
}

describe('threads video', () => {
  it('declares a single-video post type after post', () => {
    expect(threadsManifest.postTypes.map((type) => type.id)).toEqual(['post', 'video']);
    const spec = threadsManifest.postTypes.find((type) => type.id === 'video');
    expect(spec?.media.video?.maxDurationMs).toBe(300_000);
    expect(spec?.media.altText).toEqual({ supported: true, required: false, maxLength: 1000 });
  });

  it('creates a VIDEO container with video_url, text and alt_text', async () => {
    const { outcome, http, checkpoints, events } = await run({}, [createdAs(CONTAINER)]);
    expect(outcome).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(form(http.calls[0])).toEqual({
      media_type: 'VIDEO',
      video_url: media.v1.url,
      text: 'Skate',
      alt_text: 'A cat on a skateboard',
    });
    expect(checkpoints).toEqual([{ container: CONTAINER }]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual(['step:create_container']);
  });

  it('omits empty text and alt_text', async () => {
    const http = scriptedHttp([createdAs(CONTAINER)]);
    const { ctx } = testPublishContext(http, media);
    const bare = { ...clip, altText: '' };
    await threadsRuntime.publish(ctx, video({}, '', [bare]));
    expect(form(http.calls[0])).toEqual({ media_type: 'VIDEO', video_url: media.v1.url });
    const { altText: _, ...noAlt } = clip;
    const second = scriptedHttp([createdAs(CONTAINER)]);
    await threadsRuntime.publish(testPublishContext(second, media).ctx, video({}, '', [noAlt]));
    expect(form(second.calls[0])).toEqual({ media_type: 'VIDEO', video_url: media.v1.url });
  });

  it('stays pending while processing, then publishes and reads the permalink', async () => {
    const state = { container: CONTAINER };
    const waiting = await run(state, [status(CONTAINER, 'IN_PROGRESS')]);
    expect(waiting.outcome).toEqual({ kind: 'pending', pollAfterMs: 60_000 });
    const done = await run(state, [status(CONTAINER, 'FINISHED'), publishes(), permalink()]);
    expect(done.outcome).toEqual({ kind: 'published', remoteId: POST_ID, url: PERMALINK });
    expect(done.checkpoints).toEqual([{ container: CONTAINER, sentAt: SENT_AT }]);
  });

  it('fails permanently with the processing error detail', async () => {
    const { outcome } = await run({ container: CONTAINER }, [
      status(CONTAINER, 'ERROR', 'FAILED_PROCESSING_VIDEO'),
    ]);
    expect(outcome).toEqual({
      kind: 'permanent',
      code: 'container_error',
      detail: 'FAILED_PROCESSING_VIDEO',
    });
  });

  it('rejects unsuitable media before any network call', async () => {
    const second: MediaRef = { ...clip, id: 'v2' };
    const permanent = (code: string) => ({ kind: 'permanent', code });
    expect(await rejection([{ ...clip, mime: 'video/quicktime' }])).toEqual(
      permanent('video_required'),
    );
    expect(await rejection([{ ...clip, mime: 'image/jpeg' }])).toEqual(permanent('video_required'));
    expect(await rejection([{ ...clip, durationMs: 300_001 }])).toEqual(
      permanent('video_too_long'),
    );
    expect(await rejection([])).toEqual(permanent('video_required'));
    expect(await rejection([clip, second])).toEqual(permanent('video_required'));
    expect(await rejection([{ ...clip, altText: 'x'.repeat(1_001) }])).toEqual(
      permanent('alt_text_too_long'),
    );
    expect(await rejection([{ ...clip, width: 1, height: 101 }])).toEqual(
      permanent('aspect_ratio_unsupported'),
    );
  });

  it('recovers a VIDEO post by text after an ambiguous publish', async () => {
    const ours = {
      id: POST_ID,
      text: 'Skate',
      timestamp: '2026-10-21T12:00:04+0000',
      media_type: 'VIDEO',
      permalink: PERMALINK,
    };
    const http = scriptedHttp([
      status(CONTAINER, 'PUBLISHED'),
      {
        url: RECENT,
        json: { data: [{ ...ours, id: '1', media_type: 'IMAGE' }, ours] },
      },
    ]);
    const { ctx } = testPublishContext(http, media);
    if (threadsRuntime.verify === undefined) throw new Error('threads verifies');
    const result = await threadsRuntime.verify(
      ctx,
      video({ container: CONTAINER, sentAt: SENT_AT }),
    );
    http.assertDone();
    expect(result).toEqual({ kind: 'found', remoteId: POST_ID, url: PERMALINK });
  });
});
