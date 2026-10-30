import type { MediaRef, ProviderState, PublishContext, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  assertPublicSendOrder,
  egressError,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { instagramManifest } from './manifest.ts';
import { instagramRuntime } from './runtime.ts';
import {
  createdAs,
  failureOf,
  form,
  graphError,
  input,
  LIMIT,
  MEDIA,
  main,
  PERMALINK,
  PUBLISH,
  permalink,
  publishes,
  quota,
  RECENT,
  SENT_AT,
  status,
  statusUrl,
} from './testing.ts';

const jpeg: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/jpeg',
  bytes: 3,
  width: 1080,
  height: 1350,
  altText: 'A cat',
  aiGenerated: true,
};
const { altText: _alt, ...unlabelled } = jpeg;
const plain: MediaRef = { ...unlabelled, id: 'm2', aiGenerated: false };
const media = {
  m1: { url: 'https://media.example.org/m1?sig=s1', bytes: new Uint8Array([1]) },
  m2: { url: 'https://media.example.org/m2?sig=s2', bytes: new Uint8Array([2]) },
};

const image = (state: ProviderState = {}, refs: readonly MediaRef[] = [jpeg]) =>
  input('image', [main('Hello #kronaut', refs)], state);

describe('instagram publish', () => {
  it('publishes a single image: container, status, quota, sentAt checkpoint, media_publish, permalink', async () => {
    const http = scriptedHttp([
      createdAs('17900000000000001'),
      status('17900000000000001', 'FINISHED'),
      quota(3),
      publishes({ json: { id: '18000000000000009', config_issue: 'CAPTION_NOT_ATTACHED' } }),
      permalink,
    ]);
    const { ctx, checkpoints, events } = testPublishContext(http, media);
    const result = await instagramRuntime.publish(ctx, image());
    http.assertDone();

    assertPublicSendOrder(events, instagramManifest);
    expect(result).toEqual({ kind: 'published', remoteId: '18000000000000009', url: PERMALINK });
    expect(form(http.calls[0])).toEqual({
      image_url: media.m1.url,
      caption: 'Hello #kronaut',
      alt_text: 'A cat',
      is_ai_generated: 'true',
    });
    expect(form(http.calls[3])).toEqual({ creation_id: '17900000000000001' });
    expect(events).toEqual([
      'step:create_container',
      `request:POST ${MEDIA}`,
      'checkpoint',
      `request:GET ${statusUrl('17900000000000001')}`,
      `request:GET ${LIMIT}`,
      'step:publish_container',
      'checkpoint',
      `request:POST ${PUBLISH}`,
      `request:GET ${permalink.url}`,
    ]);
    expect(checkpoints).toEqual([
      { container: '17900000000000001' },
      { container: '17900000000000001', sentAt: SENT_AT },
    ]);

    const bare = scriptedHttp([
      createdAs('17900000000000002'),
      status('17900000000000002', 'IN_PROGRESS'),
    ]);
    await instagramRuntime.publish(testPublishContext(bare, media).ctx, image({}, [plain]));
    expect(form(bare.calls[0])).toEqual({ image_url: media.m2.url, caption: 'Hello #kronaut' });
  });

  it('creates carousel children without caption or AI label, then the parent in order', async () => {
    const http = scriptedHttp([
      createdAs('17900000000000011'),
      createdAs('17900000000000012'),
      createdAs('17900000000000010'),
      status('17900000000000010', 'IN_PROGRESS'),
    ]);
    const { ctx, checkpoints, events } = testPublishContext(http, media);
    const result = await instagramRuntime.publish(
      ctx,
      input('carousel', [main('Two #cats', [jpeg, plain])]),
    );
    http.assertDone();

    expect(result).toEqual({ kind: 'pending', pollAfterMs: 60_000 });
    expect(http.calls.slice(0, 3).map(form)).toEqual([
      { image_url: media.m1.url, is_carousel_item: 'true', alt_text: 'A cat' },
      { image_url: media.m2.url, is_carousel_item: 'true' },
      {
        media_type: 'CAROUSEL',
        children: '17900000000000011,17900000000000012',
        caption: 'Two #cats',
        is_ai_generated: 'true',
      },
    ]);
    const children = { m1: '17900000000000011', m2: '17900000000000012' };
    expect(checkpoints).toEqual([
      { children: { m1: '17900000000000011' } },
      { children },
      { children, container: '17900000000000010' },
    ]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual([
      'step:create_children',
      'step:create_container',
    ]);

    const stale = scriptedHttp([{ ...createdAs('x'), ...graphError(-2, 2207020) }]);
    const retry = testPublishContext(stale, media);
    expect(
      await failureOf(
        instagramRuntime.publish(
          retry.ctx,
          input('carousel', [main('Two #cats', [jpeg, plain])], { children }),
        ),
      ),
    ).toMatchObject({ kind: 'transient' });
    stale.assertDone();
    expect(retry.checkpoints.at(-1)).toEqual({});
  });

  it('returns pending while the container processes, then reuses it from state', async () => {
    const first = scriptedHttp([
      createdAs('17900000000000001'),
      status('17900000000000001', 'IN_PROGRESS'),
    ]);
    const run1 = testPublishContext(first, media);
    expect(await instagramRuntime.publish(run1.ctx, image())).toEqual({
      kind: 'pending',
      pollAfterMs: 60_000,
    });
    first.assertDone();
    const state = run1.checkpoints.at(-1) ?? {};
    expect(state).toEqual({ container: '17900000000000001' });

    const second = scriptedHttp([
      status('17900000000000001', 'FINISHED'),
      quota(0),
      publishes(),
      permalink,
    ]);
    const run2 = testPublishContext(second, media);
    expect(await instagramRuntime.publish(run2.ctx, image(state))).toMatchObject({
      kind: 'published',
      remoteId: '18000000000000009',
    });
    second.assertDone();

    const recovered = scriptedHttp([
      status('17900000000000001', 'PUBLISHED'),
      {
        url: RECENT,
        json: {
          data: [
            {
              id: '18000000000000007',
              timestamp: '2026-10-21T12:00:04+0000',
              media_type: 'IMAGE',
              alt_text: 'A cat',
              permalink: PERMALINK,
            },
            {
              id: '18000000000000006',
              timestamp: '2026-10-20T09:00:00+0000',
              media_type: 'IMAGE',
              alt_text: 'A cat',
            },
          ],
        },
      },
    ]);
    const run3 = testPublishContext(recovered, media);
    expect(
      await instagramRuntime.publish(
        run3.ctx,
        image({ container: '17900000000000001', sentAt: SENT_AT }),
      ),
    ).toEqual({ kind: 'published', remoteId: '18000000000000007', url: PERMALINK });
    recovered.assertDone();

    const unmatched = scriptedHttp([
      status('17900000000000001', 'PUBLISHED'),
      { url: RECENT, json: { data: [] } },
    ]);
    const run4 = testPublishContext(unmatched, media);
    await expect(
      instagramRuntime.publish(
        run4.ctx,
        image({ container: '17900000000000001', sentAt: SENT_AT }),
      ),
    ).rejects.toMatchObject({ error: { kind: 'ambiguous' } });
    expect(run4.events).toContain('step:publish_container');
  });

  it('maps media_publish failures and a full quota', async () => {
    const outcome = async (exchanges: readonly ScriptedExchange[]) => {
      const http = scriptedHttp([status('17900000000000001', 'FINISHED'), ...exchanges]);
      const run = testPublishContext(http, media);
      const error = await failureOf(
        instagramRuntime.publish(run.ctx, image({ container: '17900000000000001' })),
      );
      http.assertDone();
      return { error, checkpoints: run.checkpoints, events: run.events };
    };
    expect(
      (await outcome([quota(1), publishes({ status: 500, text: 'oops' })])).error,
    ).toMatchObject({
      kind: 'ambiguous',
    });
    expect(
      (await outcome([quota(1), publishes({ error: egressError('timeout') })])).error,
    ).toMatchObject({
      kind: 'ambiguous',
    });
    expect((await outcome([quota(1), publishes(graphError(4, 2207051))])).error).toEqual({
      kind: 'permanent',
      code: 'suspected_spam',
      detail: '4/2207051',
    });

    expect((await outcome([quota(1), publishes(graphError(2, 99))])).error).toMatchObject({
      kind: 'ambiguous',
    });

    const expired = await outcome([quota(1), publishes(graphError(-2, 2207020))]);
    expect(expired.error).toMatchObject({ kind: 'transient' });
    expect(expired.checkpoints.at(-1)).toEqual({});

    const full = await outcome([quota(50)]);
    expect(full.error).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ hours: 1 }),
    });
    expect(full.events).not.toContain('step:publish_container');
  });

  it('verifies by container status without public steps or signed URLs', async () => {
    const run = async (exchanges: readonly ScriptedExchange[], seconds = 0) => {
      const http = scriptedHttp(exchanges);
      const { ctx } = testPublishContext(http, media, TEST_NOW.add({ seconds }));
      const refusing: PublishContext = {
        ...ctx,
        media: { ...ctx.media, signedUrl: () => Promise.reject(new Error('no signed URLs')) },
        step: () => Promise.reject(new Error('verify must not run steps')),
        checkpoint: () => Promise.reject(new Error('verify must not checkpoint')),
      };
      if (instagramRuntime.verify === undefined) throw new Error('instagram verifies');
      const result = await instagramRuntime.verify(
        refusing,
        image({ container: '17900000000000001', sentAt: SENT_AT }),
      );
      http.assertDone();
      expect(http.calls.every((call) => call.method === 'GET')).toBe(true);
      return result;
    };
    const ours = {
      id: '18000000000000007',
      timestamp: '2026-10-21T12:00:04+0000',
      media_type: 'IMAGE',
      alt_text: 'A cat',
      permalink: PERMALINK,
    };
    const others = [
      { id: '18000000000000005', timestamp: '2026-10-21T12:00:09+0000', media_type: 'VIDEO' },
      {
        id: '18000000000000004',
        timestamp: '2026-10-21T11:40:00+0000',
        media_type: 'IMAGE',
        alt_text: 'A cat',
      },
    ];
    const published = status('17900000000000001', 'PUBLISHED');
    expect(await run([published, { url: RECENT, json: { data: [ours, ...others] } }])).toEqual({
      kind: 'found',
      remoteId: '18000000000000007',
      url: PERMALINK,
    });
    expect(
      await run([
        published,
        { url: RECENT, json: { data: [ours, { ...ours, id: '18000000000000008' }] } },
      ]),
    ).toEqual({ kind: 'inconclusive' });
    expect(await run([status('17900000000000001', 'ERROR', 'Error: 2207001')])).toEqual({
      kind: 'absent',
    });
    expect(await run([status('17900000000000001', 'FINISHED')], 30)).toEqual({
      kind: 'inconclusive',
    });
    expect(await run([status('17900000000000001', 'FINISHED')], 180)).toEqual({ kind: 'absent' });
  });

  it('rejects invalid input with a specific code before any network call', async () => {
    const reject = async (postType: string, items: readonly PublishItem[]) => {
      const http = scriptedHttp([]);
      const { ctx, checkpoints } = testPublishContext(http, media);
      const error = await failureOf(instagramRuntime.publish(ctx, input(postType, items)));
      expect(http.calls).toHaveLength(0);
      expect(checkpoints).toHaveLength(0);
      return error;
    };
    const hashtags = Array.from({ length: 31 }, (_, n) => `#t${n}`).join(' ');
    expect(await reject('carousel', [main('x', [jpeg])])).toEqual({
      kind: 'permanent',
      code: 'too_few_images',
    });
    expect(await reject('image', [main('x', [{ ...jpeg, mime: 'image/png' }])])).toEqual({
      kind: 'permanent',
      code: 'media_type_unsupported',
    });
    expect(await reject('image', [main(hashtags, [jpeg])])).toEqual({
      kind: 'permanent',
      code: 'too_many_hashtags',
    });
    expect(await reject('image', [main('x', [{ ...jpeg, width: 4000, height: 1000 }])])).toEqual({
      kind: 'permanent',
      code: 'aspect_ratio_unsupported',
    });
    expect(
      await reject('image', [
        main('x', [jpeg]),
        { position: 1, role: 'thread', text: 'y', media: [] },
      ]),
    ).toEqual({ kind: 'permanent', code: 'thread_unsupported' });
  });
});
