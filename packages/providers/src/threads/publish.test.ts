import {
  isProviderFailure,
  type ProviderError,
  type ProviderState,
  type PublishContext,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  egressError,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { threadsRuntime } from './runtime.ts';
import {
  CONTAINER,
  CREATE,
  createdAs,
  failureOf,
  form,
  graphError,
  input,
  jpeg,
  main,
  media,
  PERMALINK,
  POST_ID,
  permalink,
  png,
  publishes,
  RECENT,
  SENT_AT,
  status,
} from './testing.ts';

const text = (state: ProviderState = {}) => input([main('Ahoj z Threads')], state);

async function created(item: PublishItem, exchanges: readonly ScriptedExchange[]) {
  const http = scriptedHttp(exchanges);
  const run = testPublishContext(http, media);
  const result = await threadsRuntime.publish(run.ctx, input([item]));
  http.assertDone();
  return { result, forms: http.calls.map(form), ...run };
}

describe('threads publish: containers', () => {
  it('creates a TEXT container and waits 30 s before checking it', async () => {
    const { result, forms, checkpoints, events } = await created(main('Ahoj z Threads'), [
      createdAs(CONTAINER),
    ]);
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(forms).toEqual([{ media_type: 'TEXT', text: 'Ahoj z Threads' }]);
    expect(checkpoints).toEqual([{ container: CONTAINER }]);
    expect(events).toEqual(['step:create_container', `request:POST ${CREATE}`, 'checkpoint']);
  });

  it('creates one IMAGE container, with text only when there is some', async () => {
    const captioned = await created(main('Fotka', [png]), [createdAs(CONTAINER)]);
    expect(captioned.forms).toEqual([
      { media_type: 'IMAGE', image_url: media.m1.url, text: 'Fotka' },
    ]);
    const bare = await created(main('', [jpeg]), [createdAs(CONTAINER)]);
    expect(bare.forms).toEqual([{ media_type: 'IMAGE', image_url: media.m2.url }]);
  });

  it('creates carousel items, then the CAROUSEL container, and reuses items on retry', async () => {
    const { result, forms, checkpoints } = await created(main('Dve fotky', [png, jpeg]), [
      createdAs('17890000000000011'),
      createdAs('17890000000000012'),
      createdAs('17890000000000010'),
    ]);
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(forms).toEqual([
      { media_type: 'IMAGE', image_url: media.m1.url, is_carousel_item: 'true' },
      { media_type: 'IMAGE', image_url: media.m2.url, is_carousel_item: 'true' },
      {
        media_type: 'CAROUSEL',
        children: '17890000000000011,17890000000000012',
        text: 'Dve fotky',
      },
    ]);
    const children = { m1: '17890000000000011', m2: '17890000000000012' };
    expect(checkpoints).toEqual([
      { children: { m1: '17890000000000011' } },
      { children },
      { children, container: '17890000000000010' },
    ]);

    const http = scriptedHttp([createdAs('17890000000000012'), createdAs('17890000000000010')]);
    const retry = testPublishContext(http, media);
    await threadsRuntime.publish(
      retry.ctx,
      input([main('Dve fotky', [png, jpeg])], { children: { m1: '17890000000000011' } }),
    );
    http.assertDone();
    expect(form(http.calls[0])).toMatchObject({ image_url: media.m2.url });
  });

  it('maps the link limit to a permanent validation failure', async () => {
    const http = scriptedHttp([
      {
        ...createdAs(CONTAINER),
        ...graphError(100, 4279009, { error_user_msg: 'THREADS_API__LINK_LIMIT_EXCEEDED' }),
      },
    ]);
    const error = await failureOf(threadsRuntime.publish(testPublishContext(http).ctx, text()));
    expect(error).toEqual({ kind: 'permanent', code: 'too_many_links', detail: '100/4279009' });
  });

  it('rejects invalid input before any network call', async () => {
    const reject = async (items: readonly PublishItem[]) => {
      const http = scriptedHttp([]);
      const error = await failureOf(
        threadsRuntime.publish(testPublishContext(http).ctx, input(items)),
      );
      expect(http.calls).toHaveLength(0);
      return error;
    };
    const many = Array.from({ length: 21 }, (_, n) => ({ ...png, id: `m${n}` }));
    expect(await reject([main(' ')])).toEqual({ kind: 'permanent', code: 'text_empty' });
    expect(await reject([main('x', many)])).toEqual({ kind: 'permanent', code: 'too_many_images' });
    expect(await reject([main('x', [{ ...png, mime: 'image/webp' }])])).toEqual({
      kind: 'permanent',
      code: 'media_type_unsupported',
    });
    expect(await reject([main('x', [{ ...png, mime: 'video/mp4' }])])).toEqual({
      kind: 'permanent',
      code: 'video_unsupported',
    });
    expect(
      await reject([main('x'), { position: 1, role: 'thread', text: 'y', media: [] }]),
    ).toEqual({ kind: 'permanent', code: 'thread_unsupported' });
  });
});

async function resumed(state: ProviderState, exchanges: readonly ScriptedExchange[]) {
  const http = scriptedHttp(exchanges);
  const run = testPublishContext(http, media);
  const outcome: { result?: PublishOutcome; error?: ProviderError } = await threadsRuntime
    .publish(run.ctx, text(state))
    .then(
      (result) => ({ result }),
      (error: unknown) => {
        if (isProviderFailure(error)) return { error: error.error };
        throw error;
      },
    );
  http.assertDone();
  return { ...outcome, ...run };
}

describe('threads publish: status and publishing', () => {
  const state = { container: CONTAINER };

  it('stays pending while IN_PROGRESS', async () => {
    const { result } = await resumed(state, [status(CONTAINER, 'IN_PROGRESS')]);
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 60_000 });
  });

  it('publishes a FINISHED container and reads the permalink', async () => {
    const { result, checkpoints, events } = await resumed(state, [
      status(CONTAINER, 'FINISHED'),
      publishes(),
      permalink(),
    ]);
    expect(result).toEqual({ kind: 'published', remoteId: POST_ID, url: PERMALINK });
    expect(checkpoints).toEqual([{ container: CONTAINER, sentAt: SENT_AT }]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual(['step:publish_container']);
  });

  it('publishes without a URL when the permalink is missing', async () => {
    const { result } = await resumed(state, [
      status(CONTAINER, 'FINISHED'),
      publishes(),
      permalink({ id: POST_ID }),
    ]);
    expect(result).toEqual({ kind: 'published', remoteId: POST_ID });
  });

  it('fails permanently on ERROR, but recreates the container on UNKNOWN', async () => {
    const failed = await resumed(state, [status(CONTAINER, 'ERROR', 'INVALID_ASPEC_RATIO')]);
    expect(failed.error).toEqual({
      kind: 'permanent',
      code: 'container_error',
      detail: 'INVALID_ASPEC_RATIO',
    });
    const unknown = await resumed(state, [
      status(CONTAINER, 'ERROR', 'UNKNOWN'),
      createdAs('17890000000000002'),
    ]);
    expect(unknown.result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(unknown.checkpoints).toEqual([{}, { container: '17890000000000002' }]);
  });

  it('drops and recreates an EXPIRED container', async () => {
    const { result, checkpoints } = await resumed(state, [
      status(CONTAINER, 'EXPIRED'),
      createdAs('17890000000000003'),
    ]);
    expect(result).toEqual({ kind: 'pending', pollAfterMs: 30_000 });
    expect(checkpoints).toEqual([{}, { container: '17890000000000003' }]);
  });

  it('never retries an ambiguous threads_publish blindly', async () => {
    for (const failure of [{ status: 502 }, { error: egressError('timeout') }, graphError(1)]) {
      const { error, events } = await resumed(state, [
        status(CONTAINER, 'FINISHED'),
        publishes(failure),
      ]);
      expect(error).toMatchObject({ kind: 'ambiguous' });
      expect(events).toContain('step:publish_container');
    }
  });

  it('maps rate limits and auth errors through the shared Meta kit', async () => {
    const rate = await resumed(state, [
      status(CONTAINER, 'FINISHED'),
      publishes({ ...graphError(4), headers: { 'retry-after': '120' } }),
    ]);
    expect(rate.error).toEqual({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: TEST_NOW.add({ seconds: 120 }),
    });
    const revoked = await resumed({}, [{ ...createdAs(CONTAINER), ...graphError(190, 460) }]);
    expect(revoked.error).toEqual({ kind: 'auth_revoked' });
    const expired = await resumed({}, [{ ...createdAs(CONTAINER), ...graphError(190) }]);
    expect(expired.error).toEqual({ kind: 'auth_expired' });
  });
});

describe('threads verify', () => {
  const sent = { container: CONTAINER, sentAt: SENT_AT };
  const ours = {
    id: POST_ID,
    text: 'Ahoj z Threads',
    timestamp: '2026-10-21T12:00:04+0000',
    media_type: 'TEXT_POST',
    permalink: PERMALINK,
  };

  async function verify(
    exchanges: readonly ScriptedExchange[],
    items = [main('Ahoj z Threads')],
    seconds = 0,
  ) {
    const http = scriptedHttp(exchanges);
    const { ctx } = testPublishContext(http, media, TEST_NOW.add({ seconds }));
    const refusing: PublishContext = {
      ...ctx,
      media: { ...ctx.media, signedUrl: () => Promise.reject(new Error('no signed URLs')) },
      step: () => Promise.reject(new Error('verify must not run steps')),
      checkpoint: () => Promise.reject(new Error('verify must not checkpoint')),
    };
    if (threadsRuntime.verify === undefined) throw new Error('threads verifies');
    const result = await threadsRuntime.verify(refusing, input(items, sent));
    http.assertDone();
    expect(http.calls.every((call) => call.method === 'GET')).toBe(true);
    return result;
  }

  it('recovers the published post by text and type within the window', async () => {
    const others = [
      { ...ours, id: '18050000000000008', text: 'Iný text' },
      { ...ours, id: '18050000000000007', timestamp: '2026-10-21T11:40:00+0000' },
      { ...ours, id: '18050000000000006', media_type: 'IMAGE' },
    ];
    const published = status(CONTAINER, 'PUBLISHED');
    expect(await verify([published, { url: RECENT, json: { data: [ours, ...others] } }])).toEqual({
      kind: 'found',
      remoteId: POST_ID,
      url: PERMALINK,
    });
    const { permalink: _link, ...flagged } = ours;
    expect(await verify([published, { url: RECENT, json: { data: [flagged] } }])).toEqual({
      kind: 'found',
      remoteId: POST_ID,
    });
    expect(
      await verify([published, { url: RECENT, json: { data: [ours, { ...ours, id: '1' }] } }]),
    ).toEqual({ kind: 'inconclusive' });
  });

  it('matches a carousel on its children count', async () => {
    const album = { ...ours, text: 'Dve', media_type: 'CAROUSEL_ALBUM' };
    const two = { data: [{ id: '1' }, { id: '2' }] };
    const exchanges = (children: unknown) => [
      status(CONTAINER, 'PUBLISHED'),
      { url: RECENT, json: { data: [{ ...album, children }] } },
    ];
    expect(await verify(exchanges(two), [main('Dve', [png, jpeg])])).toMatchObject({
      kind: 'found',
    });
    expect(await verify(exchanges({ data: [{ id: '1' }] }), [main('Dve', [png, jpeg])])).toEqual({
      kind: 'inconclusive',
    });
  });

  it('reads FINISHED as absent only after the publish window settles', async () => {
    expect(await verify([status(CONTAINER, 'FINISHED')], undefined, 30)).toEqual({
      kind: 'inconclusive',
    });
    expect(await verify([status(CONTAINER, 'FINISHED')], undefined, 180)).toEqual({
      kind: 'absent',
    });
    expect(await verify([status(CONTAINER, 'EXPIRED')])).toEqual({ kind: 'absent' });
  });
});
