// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Temporal } from 'temporal-polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostSummary } from '../api.ts';
import { App, createApp } from '../app.tsx';
import { byDay, byHour } from './entries.ts';
import { dayDelta, instantOf, type MovablePost, movedLocal, slotLocal } from './move.ts';
import { visibleRange } from './time.ts';

const clock = vi.hoisted(() => ({ now: '2026-10-01T10:00:00Z' }));

vi.mock('./time.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./time.ts')>()),
  browserTimeZone: () => 'Europe/Bratislava',
  browserLanguage: () => 'en-US',
  today: () => Temporal.PlainDate.from('2026-10-01'),
  currentInstant: () => Temporal.Instant.from(clock.now),
}));

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

function destination(id: string, scheduledAt: string): PostSummary['destinations'][number] {
  return {
    id,
    accountId: `acct_${id}`,
    provider: 'bluesky',
    publishType: 'post',
    state: 'scheduled',
    scheduledAt,
    publishedAt: null,
    remoteUrl: null,
    lastErrorCode: null,
  };
}

function post(
  scheduleLocal: string,
  destinations: PostSummary['destinations'][number][],
): PostSummary {
  return {
    id: 'post_1',
    version: 3,
    title: null,
    publishSummary: 'scheduled',
    scheduleMode: 'instant',
    scheduleLocal,
    scheduleTz: 'Europe/Bratislava',
    tags: [],
    updatedAt: '2026-09-30T08:00:00.000Z',
    excerpt: 'Hello grid',
    mediaCount: 0,
    destinations,
  };
}

function mount(url: string, items: unknown[]) {
  const reschedules: unknown[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const path = new URL(request.url);
      if (path.pathname === '/v1/me') return Response.json(ME);
      if (path.pathname.endsWith('/reschedule')) {
        reschedules.push(await request.json());
        return Response.json({ error: { code: 'conflict', message: '' } }, { status: 409 });
      }
      const ranged = path.searchParams.has('from');
      return Response.json({ items: ranged ? items : [], truncated: false });
    },
  });
  const { router, queryClient } = createApp(client, createMemoryHistory({ initialEntries: [url] }));
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { router, reschedules };
}

const ELSEWHERE = [post('2026-11-20T09:00:00', [destination('z', '2026-11-20T08:00:00.000Z')])];

function cell(label: RegExp): HTMLElement {
  const found = screen
    .getAllByRole('cell')
    .find((c) => label.test(c.getAttribute('aria-label') ?? ''));
  if (found === undefined) throw new Error(`no cell ${label}`);
  return found;
}

describe('calendar time grid', () => {
  it('shows a week of day headers and 24 hour rows with the post in its hour', async () => {
    mount('/?view=week&date=2026-10-01', [
      post('2026-10-02T14:30:00', [destination('a', '2026-10-02T12:30:00.000Z')]),
    ]);
    const chip = await screen.findByRole('link', { name: /Hello grid/ });
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.getAttribute('aria-label'))).toEqual([
      'Sunday, September 27',
      'Monday, September 28',
      'Tuesday, September 29',
      'Wednesday, September 30',
      'Thursday, October 1',
      'Friday, October 2',
      'Saturday, October 3',
    ]);
    expect(headers.filter((h) => h.getAttribute('aria-current') === 'date')).toEqual([headers[4]]);
    expect(screen.getAllByRole('rowheader')).toHaveLength(24);
    expect(chip.closest('td')?.getAttribute('aria-label')).toMatch(/^Friday, October 2 at 2:00/);
  });

  it('shows one column in the day view and steps by a day', async () => {
    mount('/?view=day&date=2026-10-05', ELSEWHERE);
    await screen.findByRole('table');
    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Previous day' }).getAttribute('href')).toBe(
      '/?view=day&date=2026-10-04',
    );
    expect(screen.getByRole('link', { name: 'Next day' }).getAttribute('href')).toBe(
      '/?view=day&date=2026-10-06',
    );
    expect(screen.getByRole('button', { name: 'Day' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('opens the composer from a future cell and leaves past cells inert', async () => {
    const { router } = mount('/?view=day&date=2026-10-01', ELSEWHERE);
    await screen.findByRole('table');
    expect(within(cell(/at 11:00/)).queryByRole('link')).toBeNull();
    fireEvent.click(within(cell(/at 2:00\sPM/)).getByRole('link', { name: /^Create post: / }));
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        compose: 'new',
        at: '2026-10-01T14:00',
      }),
    );
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.search).toMatchObject({ view: 'day', date: '2026-10-01' });
    expect(await screen.findByRole('heading', { name: 'New post' })).toBeDefined();
  });

  it('drops a post on another day and hour, keeping its minutes', async () => {
    const { reschedules } = mount('/?view=week&date=2026-10-14', [
      post('2026-10-13T09:30:00', [destination('a', '2026-10-13T07:30:00.000Z')]),
    ]);
    const chip = await screen.findByRole('link', { name: /Hello grid/ });
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'all', dropEffect: 'none' };
    const target = cell(/^Thursday, October 15 at 3:00\sPM/).querySelector('[data-slot]');
    if (target === null) throw new Error('no slot');
    fireEvent.dragStart(chip, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    await waitFor(() => expect(reschedules).toHaveLength(1));
    expect(reschedules[0]).toEqual({
      expectedVersion: 3,
      scheduleLocal: '2026-10-15T15:30:00',
      scheduleTz: 'Europe/Bratislava',
    });
  });

  it('shows two chips and a +n link that opens the day view', async () => {
    const { router } = mount('/?view=week&date=2026-10-14', [
      post('2026-10-13T09:00:00', [
        destination('a', '2026-10-13T07:00:00.000Z'),
        destination('b', '2026-10-13T07:10:00.000Z'),
        destination('c', '2026-10-13T07:20:00.000Z'),
      ]),
    ]);
    await screen.findAllByRole('link', { name: /Hello grid/ });
    const busy = cell(/^Tuesday, October 13 at 9:00/);
    expect(within(busy).getAllByRole('link', { name: /Hello grid/ })).toHaveLength(2);
    fireEvent.click(within(busy).getByRole('link', { name: '+1 more' }));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ view: 'day', date: '2026-10-13' }),
    );
    expect(await screen.findAllByRole('columnheader')).toHaveLength(1);
  });
});

describe('hour buckets', () => {
  it('puts both 02:30 posts of the autumn DST day in hour 2 and skips the lost spring hour', () => {
    const items = [
      post('2026-10-25T02:30:00', [
        destination('a', '2026-10-25T00:30:00.000Z'),
        destination('b', '2026-10-25T01:30:00.000Z'),
      ]),
      post('2026-03-29T03:30:00', [destination('c', '2026-03-29T01:30:00.000Z')]),
    ];
    const slots = byHour(byDay(items, 'Europe/Bratislava'));
    expect([...slots.keys()].sort()).toEqual(['2026-03-29T03', '2026-10-25T02']);
    expect(slots.get('2026-10-25T02')?.map((e) => e.destination.id)).toEqual(['a', 'b']);
  });
});

describe('dropping into the current hour', () => {
  it('refuses a slot whose kept minutes are already past and accepts later ones', () => {
    clock.now = '2026-10-01T10:40:00Z';
    try {
      const moving = post('2026-10-02T14:15:00', [
        destination('a', '2026-10-02T12:15:00.000Z'),
      ]) as MovablePost;
      const at = '2026-10-02T12:15:00.000Z';
      expect(slotLocal(moving, at, '2026-10-01T12', 'Europe/Bratislava')).toBeNull();
      expect(slotLocal(moving, at, '2026-10-01T13', 'Europe/Bratislava')).toBe(
        '2026-10-01T13:15:00',
      );
    } finally {
      clock.now = '2026-10-01T10:00:00Z';
    }
  });
});

describe('DST changes in Europe/Bratislava', () => {
  const TZ = 'Europe/Bratislava';

  it('keeps the wall time when a post moves by whole days across either change', () => {
    const spring = post('2027-03-27T09:30:00', []) as MovablePost;
    const springDays = dayDelta('2027-03-27', '2027-03-29');
    expect(springDays).toBe(2);
    const springLocal = movedLocal(spring, springDays);
    expect(springLocal).toBe('2027-03-29T09:30:00');
    expect(instantOf({ scheduleLocal: springLocal, scheduleTz: TZ })).toBe('2027-03-29T07:30:00Z');
    const autumn = post('2026-10-24T09:30:00', []) as MovablePost;
    const autumnLocal = movedLocal(autumn, dayDelta('2026-10-24', '2026-10-26'));
    expect(autumnLocal).toBe('2026-10-26T09:30:00');
    expect(instantOf({ scheduleLocal: autumnLocal, scheduleTz: TZ })).toBe('2026-10-26T08:30:00Z');
  });

  it('resolves a drop into the lost spring hour forward', () => {
    const moving = post('2027-03-27T02:15:00', []) as MovablePost;
    const local = slotLocal(moving, '2027-03-27T01:15:00Z', '2027-03-28T02', TZ);
    expect(local).toBe('2027-03-28T03:15:00');
    const at = instantOf({ scheduleLocal: local ?? '', scheduleTz: TZ });
    expect(Temporal.Instant.compare(at, '2027-03-28T01:00:00Z')).toBeGreaterThanOrEqual(0);
  });

  it('bounds the DST weeks and days by local midnight', () => {
    expect(visibleRange('week', Temporal.PlainDate.from('2027-03-28'), 1, TZ)).toMatchObject({
      from: '2027-03-21T23:00:00Z',
      to: '2027-03-28T22:00:00Z',
    });
    expect(visibleRange('week', Temporal.PlainDate.from('2026-10-25'), 1, TZ)).toMatchObject({
      from: '2026-10-18T22:00:00Z',
      to: '2026-10-25T23:00:00Z',
    });
    const hours = (date: string) => {
      const { from, to } = visibleRange('day', Temporal.PlainDate.from(date), 1, TZ);
      return Temporal.Instant.from(from).until(to, { largestUnit: 'hour' }).hours;
    };
    expect(hours('2027-03-28')).toBe(23);
    expect(hours('2026-10-25')).toBe(25);
  });
});
