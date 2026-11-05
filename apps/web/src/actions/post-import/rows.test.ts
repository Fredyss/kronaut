import { describe, expect, it } from 'vitest';
import type { Channel } from '../../records/channels/queries.ts';
import type { CsvRecord } from './csv.ts';
import type { MediaResult } from './media-fetch.ts';
import { finishRow } from './media-rows.ts';
import { mapRecord, type RowContext, rowIndex } from './rows.ts';

const ada: Channel = {
  id: 'acct_ada',
  provider: 'bluesky',
  accountKind: 'personal',
  handle: '@Ada.bsky.social',
  displayName: 'Ada',
  profileUrl: null,
  status: 'active',
  statusReason: null,
  accessExpiresAt: null,
  connectedAt: '2026-10-01T08:00:00.000Z',
  lastErrorCode: null,
  postTypes: [],
  signature: null,
  shortenLinks: true,
  brandId: null,
  preview: 'short-feed',
  insights: false,
};
const bob: Channel = { ...ada, id: 'acct_bob', handle: 'bob', displayName: 'Bob' };
const twin: Channel = { ...ada, id: 'acct_twin', provider: 'mastodon', handle: 'bob' };
const gram: Channel = {
  ...ada,
  id: 'acct_gram',
  provider: 'instagram',
  handle: 'gram',
  displayName: 'Gram',
};
const gone: Channel = { ...ada, id: 'acct_gone', handle: 'gone', status: 'disconnected' };

const context: RowContext = {
  channels: [ada, bob, twin, gram, gone],
  defaults: new Set(['acct_ada']),
  tz: 'Europe/Bratislava',
};

function record(values: Partial<CsvRecord['values']>): CsvRecord {
  return {
    line: 2,
    values: { text: 'Ahoj', channels: '', date: '', time: '', media: '', ...values },
  };
}

function map(source: CsvRecord, rowContext: RowContext, results: Results = new Map()) {
  const drafted = mapRecord(source, rowContext);
  return 'draft' in drafted ? finishRow(drafted.draft, results, rowContext) : drafted;
}

type Results = ReadonlyMap<string, MediaResult>;

function ready(id: string, kind: 'image' | 'video', mime: string, bytes = 1000): MediaResult {
  return { kind: 'ready', asset: { id, kind, mime, bytes } };
}

const JPEG = 'https://cdn.a.test/one.jpg';
const PNG = 'https://cdn.a.test/two.png?token=secret';
const CLIP = 'https://videos.b.test/clip.mp4';
const fetched: Results = new Map([
  [JPEG, ready('media_jpeg', 'image', 'image/jpeg')],
  [PNG, ready('media_png', 'image', 'image/png', 3_000_000)],
  [CLIP, ready('media_clip', 'video', 'video/mp4')],
]);

describe('row mapping', () => {
  it('builds an NFC doc and uses the default channels for an empty column', () => {
    expect(map(record({ text: ' Pečené\nkurča ' }), context)).toEqual({
      row: {
        items: [
          {
            doc: {
              type: 'doc',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Pečené' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'kurča' }] },
              ],
            },
          },
        ],
        destinations: [{ accountId: 'acct_ada', publishType: 'post' }],
        schedule: { mode: 'queue' },
      },
    });
  });

  it('matches handles without case or a leading @, split by commas, semicolons or spaces', () => {
    const mapped = map(record({ channels: 'ada.BSKY.social;  @ada.bsky.social' }), context);
    expect(mapped).toMatchObject({ row: { destinations: [{ accountId: 'acct_ada' }] } });
  });

  it('names unknown and ambiguous handles and channels that cannot take text', () => {
    expect(map(record({ channels: 'nobody, bob gram gone' }), context)).toEqual({
      problems: [
        { kind: 'handle_unknown', handle: 'nobody' },
        { kind: 'handle_ambiguous', handle: 'bob' },
        { kind: 'channel_text_only', channel: gram },
        { kind: 'channel_inactive', channel: gone },
      ],
    });
  });

  it('decides a handle among the channels that can take the row', () => {
    const insta: Channel = { ...gram, id: 'acct_insta', handle: 'acme' };
    const threads: Channel = { ...ada, id: 'acct_threads', provider: 'threads', handle: '@acme' };
    const pair = { ...context, channels: [insta, threads] };
    expect(map(record({ channels: '@acme' }), pair)).toMatchObject({
      row: { destinations: [{ accountId: 'acct_threads', publishType: 'post' }] },
    });
    const unusable = {
      ...context,
      channels: [insta, { ...threads, status: 'disconnected' as const }],
    };
    expect(map(record({ channels: 'acme' }), unusable)).toEqual({
      problems: [{ kind: 'channel_text_only', channel: insta }],
    });
  });

  it('needs text and at least one channel', () => {
    const none = { ...context, defaults: new Set<string>() };
    expect(map(record({ text: '  ' }), none)).toEqual({
      problems: [{ kind: 'text_empty' }, { kind: 'no_channels' }],
    });
  });

  it('turns a date and a time into a local time in the chosen zone', () => {
    expect(map(record({ date: '2026-12-31', time: '09:30' }), context)).toMatchObject({
      row: {
        schedule: {
          mode: 'instant',
          scheduleLocal: '2026-12-31T09:30:00',
          scheduleTz: 'Europe/Bratislava',
        },
      },
    });
  });

  it.each([
    ['2026-12-31', '9:30', '2026-12-31T09:30:00'],
    ['2026-12-31', '09:30:00', '2026-12-31T09:30:00'],
    ['31.12.2026', '09:30', '2026-12-31T09:30:00'],
    ['1. 2. 2027', '7:05', '2027-02-01T07:05:00'],
    ['1.2. 2027', '23:59', '2027-02-01T23:59:00'],
  ])('reads date %j with time %j', (date, time, scheduleLocal) => {
    expect(map(record({ date, time }), context)).toMatchObject({
      row: { schedule: { mode: 'instant', scheduleLocal } },
    });
  });

  it.each([
    ['2026-02-30', '09:30', 'date_invalid'],
    ['30.2.2026', '09:30', 'date_invalid'],
    ['2026-12-31', '24:00', 'date_invalid'],
    ['2026-12-31', '09:30:15', 'date_invalid'],
    ['2026-12-31', '930', 'date_invalid'],
    ['12/31/2026', '09:30', 'date_invalid'],
    ['31/12/2026', '09:30', 'date_invalid'],
    ['31.12.26', '09:30', 'date_invalid'],
    ['2026-12-31', '', 'date_half'],
    ['', '09:30', 'date_half'],
  ])('refuses date %j with time %j', (date, time, kind) => {
    expect(map(record({ date, time }), context)).toEqual({ problems: [{ kind }] });
  });

  it('attaches media in link order and picks the publish type per channel', () => {
    const video = map(record({ channels: 'gram', media: CLIP }), context, fetched);
    expect(video).toMatchObject({
      row: {
        items: [{ media: [{ mediaId: 'media_clip', altText: null }] }],
        destinations: [{ accountId: 'acct_gram', publishType: 'reel' }],
      },
    });
    const images = map(
      record({ channels: 'gram ada.bsky.social', media: `${JPEG}|https://cdn.a.test/one.jpg` }),
      context,
      fetched,
    );
    expect(images).toMatchObject({
      row: {
        items: [{ media: [{ mediaId: 'media_jpeg' }, { mediaId: 'media_jpeg' }] }],
        destinations: [
          { accountId: 'acct_gram', publishType: 'carousel' },
          { accountId: 'acct_ada', publishType: 'post' },
        ],
      },
    });
  });

  it('checks only that handles exist before the media is fetched', () => {
    expect(mapRecord(record({ channels: 'gram', media: JPEG }), context)).toHaveProperty('draft');
    expect(mapRecord(record({ channels: 'nobody', media: JPEG }), context)).toEqual({
      problems: [{ kind: 'handle_unknown', handle: 'nobody' }],
    });
  });

  it('names only the host of a link that failed or was refused', () => {
    const results: Results = new Map([
      [PNG, { kind: 'failed' }],
      [CLIP, { kind: 'rejected' }],
    ]);
    expect(map(record({ media: `${PNG} ${CLIP}` }), context, results)).toEqual({
      problems: [
        { kind: 'media_failed', host: 'cdn.a.test' },
        { kind: 'media_rejected', host: 'videos.b.test' },
      ],
    });
  });

  it.each([[`${CLIP} ${JPEG}`], [`${CLIP} ${CLIP}`]])(
    'refuses a video mixed with other media: %j',
    (media) => {
      expect(map(record({ media }), context, fetched)).toEqual({
        problems: [{ kind: 'media_mix' }],
      });
    },
  );

  it('refuses a channel that cannot take the media', () => {
    expect(map(record({ channels: 'ada.bsky.social gram', media: PNG }), context, fetched)).toEqual(
      {
        problems: [
          { kind: 'channel_media', channel: ada },
          { kind: 'channel_media', channel: gram },
        ],
      },
    );
  });

  it('decides a handle among the channels that can take the media', () => {
    const insta: Channel = { ...gram, id: 'acct_insta', handle: 'acme' };
    const threads: Channel = { ...ada, id: 'acct_threads', provider: 'threads', handle: '@acme' };
    const pair = { ...context, channels: [insta, threads] };
    expect(map(record({ channels: 'acme', media: JPEG }), pair, fetched)).toEqual({
      problems: [{ kind: 'handle_ambiguous', handle: 'acme' }],
    });
    expect(map(record({ channels: 'acme', media: PNG }), pair, fetched)).toMatchObject({
      row: { destinations: [{ accountId: 'acct_threads', publishType: 'post' }] },
    });
  });

  it('finds the row of a server issue path', () => {
    expect(rowIndex('body.rows.12.destinations.0.accountId')).toBe(12);
    expect(rowIndex('body.rows.3')).toBe(3);
    expect(rowIndex('body.rowsx')).toBeNull();
  });
});
