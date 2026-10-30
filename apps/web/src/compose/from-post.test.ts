import { describe, expect, it } from 'vitest';
import type { Channel, Post } from '../api.ts';
import { editableBy } from '../post-actions/permissions.ts';
import type { MediaAsset } from '../post-actions/post-media.ts';
import { effective } from './contents.ts';
import { docParagraphs } from './doc.ts';
import { type FromPost, fromPost, type Refusal } from './from-post.ts';

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

function item(role: string, text: string, media: readonly string[] = []) {
  return {
    role,
    doc: doc(text),
    media: media.map((mediaId, position) => ({ mediaId, altText: `alt ${mediaId}`, position })),
    position: 0,
  };
}

function destination(
  accountId: string,
  variant: number | null = null,
  publishType = 'post',
  state = 'draft',
) {
  return { accountId, variant, publishType, state, settings: {}, deliveryMode: 'auto' };
}

function post(fields: Record<string, unknown>): Post {
  const base = {
    id: 'post_1',
    scheduleMode: 'unscheduled',
    scheduleLocal: null,
    scheduleTz: null,
    items: [item('main', 'Main')],
    variants: [],
    destinations: [destination('acct_a')],
  };
  return { ...base, ...fields } as unknown as Post;
}

function channel(id: string, provider = 'bluesky', status = 'active'): Channel {
  return { id, provider, status } as unknown as Channel;
}

function asset(id: string, fields: Partial<MediaAsset> = {}): MediaAsset {
  const facts = { bytes: 10, mime: 'image/jpeg', state: 'ready', kind: 'image' };
  return {
    id,
    previewUrl: `https://cdn/${id}`,
    aiGenerated: false,
    ...facts,
    ...fields,
  } as MediaAsset;
}

function open(fields: Record<string, unknown>, assets: readonly MediaAsset[] = []): FromPost {
  const known = new Map(assets.map((entry) => [entry.id, entry]));
  return fromPost(post(fields), known, [channel('acct_a'), channel('acct_b')]);
}

function form(result: FromPost) {
  if (!result.ok) throw new Error(result.reason);
  return result.form;
}

const texts = (value: Parameters<typeof docParagraphs>[0]) =>
  docParagraphs(value).map((paragraph) => paragraph.text);

describe('fromPost', () => {
  it('round-trips variants, replies and a comment', () => {
    const { contents, selected } = form(
      open(
        {
          items: [item('main', 'Main', ['m1']), item('thread', 'Reply'), item('comment', 'Last')],
          variants: [{ items: [item('main', 'Custom', ['m1'])] }],
          destinations: [destination('acct_a'), destination('acct_b', 0)],
        },
        [asset('m1', { aiGenerated: true })],
      ),
    );

    expect([...selected]).toEqual(['acct_a', 'acct_b']);
    expect(texts(contents.base.doc)).toEqual(['Main']);
    expect(contents.base.replies.map((reply) => texts(reply.doc))).toEqual([['Reply']]);
    expect(texts(contents.base.comment?.doc)).toEqual(['Last']);
    expect(contents.base.images).toEqual([
      {
        id: 'm1',
        file: null,
        facts: { size: 10, type: 'image/jpeg' },
        thumb: 'https://cdn/m1',
        altText: 'alt m1',
        aiGenerated: true,
      },
    ]);
    expect([...contents.customized.keys()]).toEqual(['acct_b']);
    expect(texts(effective(contents, 'acct_b').doc)).toEqual(['Custom']);
    expect(effective(contents, 'acct_a')).toBe(contents.base);
  });

  it('seeds a ready video with no file', () => {
    const clip = asset('v1', { kind: 'video', mime: 'video/mp4', durationMs: 4000 });
    const { contents, videos } = form(
      fromPost(
        post({
          items: [item('main', 'Clip', ['v1'])],
          destinations: [destination('acct_a', null, 'video')],
        }),
        new Map([['v1', clip]]),
        [channel('acct_a', 'threads')],
      ),
    );
    expect(contents.base.video).toEqual({ id: 'v1', altText: 'alt v1' });
    expect(contents.base.images).toEqual([]);
    expect(videos.get('v1')).toMatchObject({
      file: null,
      url: null,
      poster: 'https://cdn/v1',
      phase: { kind: 'ready', asset: { id: 'v1', durationMs: 4000 } },
    });
  });

  const scheduled = { destinations: [destination('acct_a', null, 'post', 'scheduled')] };
  const future = { scheduleLocal: '2999-03-01T09:30:00', scheduleTz: 'Europe/Vienna' };

  it.each<[string, Record<string, unknown>, string]>([
    ['unscheduled', { scheduleMode: 'unscheduled' }, 'draft'],
    ['scheduled asap', { ...scheduled, scheduleMode: 'asap' }, 'asap'],
    ['per destination', { ...scheduled, scheduleMode: 'local_per_destination' }, 'queue'],
    [
      'past instant',
      {
        ...scheduled,
        scheduleMode: 'instant',
        scheduleLocal: '2020-01-01T09:00:00',
        scheduleTz: 'UTC',
      },
      'draft',
    ],
    ['in review with a time', { scheduleMode: 'instant', ...future }, 'draft'],
    ['in review per destination', { scheduleMode: 'local_per_destination' }, 'draft'],
    [
      'canceled asap',
      { scheduleMode: 'asap', destinations: [destination('acct_a', null, 'post', 'canceled')] },
      'draft',
    ],
    [
      'canceled instant',
      {
        ...future,
        scheduleMode: 'instant',
        destinations: [destination('acct_a', null, 'post', 'canceled')],
      },
      'draft',
    ],
  ])('starts %s on the right mode', (_name, fields, mode) => {
    expect(form(open(fields)).when).toEqual({ mode });
  });

  it('starts a future instant on its own time', () => {
    const fixed = future;
    expect(form(open({ ...scheduled, scheduleMode: 'instant', ...fixed })).when).toEqual({
      mode: 'instant',
      at: fixed.scheduleLocal,
      tz: fixed.scheduleTz,
    });
  });

  const video = (id: string) => asset(id, { kind: 'video', mime: 'video/mp4' });
  const rich = (role: string) => ({
    ...item(role, 'x'),
    doc: { type: 'doc', content: [{ type: 'bulletList', content: [] }] },
  });
  const refusals: readonly [Refusal, Record<string, unknown>, readonly MediaAsset[]][] = [
    ['channel_unavailable', { destinations: [destination('acct_gone')] }, []],
    ['channel_twice', { destinations: [destination('acct_a'), destination('acct_a')] }, []],
    ['reply_media', { items: [item('main', 'M'), item('thread', 'R', ['m1'])] }, [asset('m1')]],
    ['reply_media', { items: [item('main', 'M'), item('comment', 'C', ['m1'])] }, [asset('m1')]],
    ['mixed_media', { items: [item('main', 'M', ['m1', 'v1'])] }, [asset('m1'), video('v1')]],
    ['many_videos', { items: [item('main', 'M', ['v1', 'v2'])] }, [video('v1'), video('v2')]],
    ['repeated_media', { items: [item('main', 'M', ['m1', 'm1'])] }, [asset('m1')]],
    ['media_unavailable', { items: [item('main', 'M', ['gone'])] }, []],
    ['media_unavailable', { items: [item('main', 'M', ['m1'])] }, [asset('m1', { bytes: null })]],
    ['media_unavailable', { items: [item('main', 'M', ['m1'])] }, [asset('m1', { mime: null })]],
    ['item_order', { items: [item('main', 'A'), item('main', 'B')] }, []],
    ['item_order', { items: [item('main', 'A'), item('comment', 'C'), item('thread', 'R')] }, []],
    ['item_order', { items: [item('thread', 'R'), item('main', 'A')] }, []],
    ['publish_type', { destinations: [destination('acct_a', null, 'story')] }, []],
    ['rich_content', { items: [rich('main')] }, []],
    ['rich_content', { items: [item('main', 'M'), rich('thread')] }, []],
    ['rich_content', { items: [item('main', 'M'), rich('comment')] }, []],
    [
      'rich_content',
      { variants: [{ items: [rich('main')] }], destinations: [destination('acct_a', 0)] },
      [],
    ],
  ];

  it.each(refusals)('refuses %s', (reason, fields, assets) => {
    expect(open(fields, assets)).toEqual({ ok: false, reason });
  });

  it('refuses a channel that is no longer active or a variant it cannot take', () => {
    const known = new Map<string, MediaAsset>();
    const inactive = fromPost(post({}), known, [channel('acct_a', 'bluesky', 'expired')]);
    expect(inactive).toEqual({ ok: false, reason: 'channel_unavailable' });
    const noImage = fromPost(
      post({ destinations: [destination('acct_ig', null, 'image')] }),
      known,
      [channel('acct_ig', 'instagram')],
    );
    expect(noImage).toEqual({ ok: false, reason: 'channel_unavailable' });
  });
});

describe('editableBy', () => {
  const states = (...list: readonly string[]) => ({
    destinations: list.map((state) => ({ state })),
  });

  it('needs a destination, all draft, canceled or scheduled', () => {
    expect(editableBy('owner', states())).toBe(false);
    expect(editableBy('owner', states('draft', 'canceled', 'scheduled'))).toBe(true);
    expect(editableBy('owner', states('draft', 'published'))).toBe(false);
    expect(editableBy('owner', states('failed'))).toBe(false);
  });

  it('asks a scheduled post for a schedule role and a draft for a draft role', () => {
    expect(editableBy('contributor', states('draft'))).toBe(true);
    expect(editableBy('contributor', states('scheduled'))).toBe(false);
    expect(editableBy('editor', states('scheduled'))).toBe(true);
    expect(editableBy('viewer', states('draft'))).toBe(false);
  });
});
