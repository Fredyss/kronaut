import { describe, expect, it } from 'vitest';
import type { Channel } from '../channels/queries.ts';
import type { CsvRecord } from './csv.ts';
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
  return { line: 2, values: { text: 'Ahoj', channels: '', date: '', time: '', ...values } };
}

describe('row mapping', () => {
  it('builds an NFC doc and uses the default channels for an empty column', () => {
    expect(mapRecord(record({ text: ' Pečené\nkurča ' }), context)).toEqual({
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
    const mapped = mapRecord(record({ channels: 'ada.BSKY.social;  @ada.bsky.social' }), context);
    expect(mapped).toMatchObject({ row: { destinations: [{ accountId: 'acct_ada' }] } });
  });

  it('names unknown and ambiguous handles and channels that cannot take text', () => {
    expect(mapRecord(record({ channels: 'nobody, bob gram gone' }), context)).toEqual({
      problems: [
        { kind: 'handle_unknown', handle: 'nobody' },
        { kind: 'handle_ambiguous', handle: 'bob' },
        { kind: 'channel_text_only', channel: gram },
        { kind: 'channel_inactive', channel: gone },
      ],
    });
  });

  it('needs text and at least one channel', () => {
    const none = { ...context, defaults: new Set<string>() };
    expect(mapRecord(record({ text: '  ' }), none)).toEqual({
      problems: [{ kind: 'text_empty' }, { kind: 'no_channels' }],
    });
  });

  it('turns a date and a time into a local time in the chosen zone', () => {
    expect(mapRecord(record({ date: '2026-12-31', time: '09:30' }), context)).toMatchObject({
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
    ['2026-02-30', '09:30', 'date_invalid'],
    ['2026-12-31', '24:00', 'date_invalid'],
    ['31.12.2026', '09:30', 'date_invalid'],
    ['2026-12-31', '9:30', 'date_invalid'],
    ['2026-12-31', '', 'date_half'],
    ['', '09:30', 'date_half'],
  ])('refuses date %j with time %j', (date, time, kind) => {
    expect(mapRecord(record({ date, time }), context)).toEqual({ problems: [{ kind }] });
  });

  it('finds the row of a server issue path', () => {
    expect(rowIndex('body.rows.12.destinations.0.accountId')).toBe(12);
    expect(rowIndex('body.rows.3')).toBe(3);
    expect(rowIndex('body.rowsx')).toBeNull();
  });
});
