import { describe, expect, it } from 'vitest';
import { slotCompose, slotKey } from './calendar/entries.ts';
import { calendarSearch } from './calendar-search.ts';
import { composeSearch } from './compose-search.ts';

describe('tag filter', () => {
  it('keeps a public tag id and drops anything else', () => {
    const tag = 'tag_01jbcdefghjkmnpqrstvwxyz01';
    expect(calendarSearch({ tag })).toEqual({ tag });
    expect(calendarSearch({ tag: 'post_01jbcdefghjkmnpqrstvwxyz01' })).toEqual({});
    expect(calendarSearch({ tag: 'launch' })).toEqual({});
  });
});

describe('slot to composer', () => {
  it('opens the composer at the slot in the shown time zone', () => {
    const search = slotCompose(slotKey('2026-10-01', 9), 'Europe/Bratislava');
    expect(calendarSearch({ view: 'day', ...search })).toEqual({
      view: 'day',
      compose: 'new',
      at: '2026-10-01T09:00',
      tz: 'Europe/Bratislava',
    });
  });

  it('keeps a public post id for the edit dialog and the compose route, and nothing else', () => {
    const post = 'post_01jbcdefghjkmnpqrstvwxyz01';
    expect(calendarSearch({ compose: post, at: '2026-10-01T09:00' })).toEqual({ compose: post });
    expect(calendarSearch({ compose: 'post_1' })).toEqual({});
    expect(calendarSearch({ compose: 'new', post })).toEqual({ compose: 'new' });
    expect(composeSearch({ post })).toEqual({ post });
    expect(composeSearch({ post: 'media_01jbcdefghjkmnpqrstvwxyz01' })).toEqual({});
  });

  it('drops a time and zone without the dialog, and anything malformed', () => {
    expect(calendarSearch({ at: '2026-10-01T09:00', tz: 'UTC' })).toEqual({});
    expect(calendarSearch({ compose: 'new', at: '2026-10-01 09:00', tz: 'Mars/Olympus' })).toEqual({
      compose: 'new',
    });
    expect(composeSearch({ at: '2026-10-01T09:00', tz: 'America/New_York' })).toEqual({
      at: '2026-10-01T09:00',
      tz: 'America/New_York',
    });
  });
});
