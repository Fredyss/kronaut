// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const LIST = '/v1/workspaces/ws_1/notifications';

function note(id: string, kind: string, extra: object = {}) {
  return {
    id,
    kind,
    createdAt: '2026-10-13T08:00:00.000Z',
    readAt: null,
    postId: 'post_1',
    destinationId: 'dst_1',
    socialAccountId: 'acct_1',
    provider: 'bluesky',
    reason: null,
    state: null,
    accountLabel: 'Ada',
    accountHandle: 'ada.bsky.social',
    excerpt: `Hello ${id}`,
    ...extra,
  };
}

interface List {
  readonly items: unknown[];
  readonly unread: number;
}

type Marking = 'ok' | 'fail' | 'hold';

function mount(list: List, marking: Marking = 'ok') {
  const marks: unknown[] = [];
  const lists = { count: 0 };
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      if (url.pathname === '/v1/me') return Response.json(ME);
      if (url.pathname === LIST) {
        lists.count += 1;
        expect(url.searchParams.get('limit')).toBe('20');
        return Response.json(list);
      }
      if (url.pathname === `${LIST}/read` && request.method === 'POST') {
        marks.push(await request.json());
        if (marking === 'hold') return await new Promise<Response>(() => {});
        if (marking === 'fail') {
          return Response.json({ error: { code: 'internal', message: '' } }, { status: 500 });
        }
        return Response.json({ unread: 0 });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/channels'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { marks, lists, router };
}

async function bell(name: RegExp | string = /^Notifications/): Promise<HTMLElement> {
  return await screen.findByRole('button', { name });
}

async function openPanel(): Promise<HTMLElement> {
  const button = await bell();
  fireEvent.click(button);
  const id = button.getAttribute('aria-controls');
  expect(button.getAttribute('aria-expanded')).toBe('true');
  await screen.findByRole('heading', { name: 'Notifications' });
  const panel = id === null ? null : document.getElementById(id);
  if (panel === null) throw new Error('no panel');
  return panel;
}

const FOUR = [
  note('ntf_4', 'destination.failed', { reason: 'attempts_exhausted' }),
  note('ntf_3', 'destination.unconfirmed', { accountLabel: null }),
  note('ntf_2', 'destination.awaiting_manual', { excerpt: null }),
  note('ntf_1', 'channel.needs_reauth', { postId: null, destinationId: null, excerpt: null }),
  note('ntf_0', 'post.something_new', { readAt: '2026-10-13T09:00:00.000Z', excerpt: '' }),
];

describe('notifications bell', () => {
  it.each([
    [3, '3', 'Notifications, 3 unread'],
    [150, '99+', 'Notifications, 150 unread'],
  ])('badges the bell with %i unread', async (unread, shown, name) => {
    mount({ items: [], unread });
    const button = await bell(name);
    expect(button.querySelector('span[aria-hidden="true"]')?.textContent).toBe(shown);
  });

  it('hides the badge at zero', async () => {
    const { lists } = mount({ items: [], unread: 0 });
    await waitFor(() => expect(lists.count).toBe(1));
    const button = await bell('Notifications');
    expect(button.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('renders each kind with its text and link, and marks nothing on open', async () => {
    const { marks } = mount({ items: FOUR, unread: 4 });
    const panel = await openPanel();
    const links = within(panel).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/posts/post_1',
      '/posts/post_1',
      '/inbox',
      '/channels',
      '/posts/post_1',
    ]);
    expect(links[0]?.textContent).toContain("Couldn't publish to Ada");
    expect(links[0]?.textContent).toContain('Hello ntf_4');
    expect(within(links[0] as HTMLElement).getByText('Unread')).toBeDefined();
    expect(links[0]?.querySelector('time')?.getAttribute('dateTime')).toBe(
      '2026-10-13T08:00:00.000Z',
    );
    expect(links[1]?.textContent).toContain('Not sure it was posted to Bluesky');
    expect(links[2]?.textContent).toContain('Ready for you to post on Ada');
    expect(links[3]?.textContent).toContain('Ada needs reconnecting');
    expect(links[4]?.textContent).toContain('Something needs your attention');
    expect(links[4]?.textContent).toContain('No text');
    expect(within(links[4] as HTMLElement).queryByText('Unread')).toBeNull();
    expect(within(panel).queryByText(/Older unread notifications/)).toBeNull();
    expect(marks).toEqual([]);
  });

  it('links an expiring channel to Channels', async () => {
    mount({
      items: [note('ntf_5', 'channel.expiring', { postId: null, excerpt: null })],
      unread: 1,
    });
    const link = within(await openPanel()).getByRole('link');
    expect([link.getAttribute('href'), link.textContent]).toEqual([
      '/channels',
      expect.stringContaining('Ada needs reconnecting soon'),
    ]);
  });

  it('shows the empty state without Mark all as read', async () => {
    mount({ items: [], unread: 0 });
    const panel = await openPanel();
    expect(within(panel).getByText("You're all caught up")).toBeDefined();
    expect(within(panel).queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('points to the inbox when more are unread than shown', async () => {
    mount({ items: [note('ntf_9', 'destination.failed')], unread: 30 });
    const panel = await openPanel();
    const older = within(panel).getByRole('link', { name: /Older unread notifications/ });
    expect(older.getAttribute('href')).toBe('/inbox');
  });

  it('closes on Escape and on an outside click, returning focus on Escape', async () => {
    mount({ items: [], unread: 0 });
    const button = await bell();
    await openPanel();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('false'));
    expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull();
    expect(document.activeElement).toBe(button);
    await openPanel();
    fireEvent.pointerDown(screen.getByRole('main'));
    await waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('false'));
    fireEvent.pointerDown(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('marks an unread item read when clicked and closes the panel', async () => {
    const { marks, lists } = mount({ items: FOUR, unread: 4 });
    const button = await bell();
    const panel = await openPanel();
    await waitFor(() => expect(lists.count).toBe(2));
    fireEvent.click(within(panel).getByRole('link', { name: /Ada needs reconnecting/ }));
    await waitFor(() => expect(marks).toEqual([{ ids: ['ntf_1'] }]));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
    await waitFor(() => expect(lists.count).toBe(3));
  });

  it('navigates without waiting for the mark-read request', async () => {
    const { marks, router } = mount({ items: FOUR, unread: 4 }, 'hold');
    const panel = await openPanel();
    fireEvent.click(within(panel).getByRole('link', { name: /Couldn't publish to Ada/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(marks).toEqual([{ ids: ['ntf_4'] }]);
  });

  it('does not mark a read item again', async () => {
    const { marks } = mount({ items: FOUR, unread: 4 });
    const panel = await openPanel();
    fireEvent.click(within(panel).getByRole('link', { name: /Something needs your attention/ }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull(),
    );
    expect(marks).toEqual([]);
  });

  it('marks all read up to the newest id', async () => {
    const { marks } = mount({ items: FOUR, unread: 4 });
    const panel = await openPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(marks).toEqual([{ upTo: 'ntf_4' }]));
  });

  it('toasts and keeps the unread count when marking fails', async () => {
    mount({ items: FOUR, unread: 4 }, 'fail');
    const panel = await openPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByText("Couldn't mark them as read. Try again.")).toBeDefined();
    expect(await bell('Notifications, 4 unread')).toBeDefined();
  });
});

describe('account menu', () => {
  it('opens as a disclosure and closes on Escape, returning focus', async () => {
    mount({ items: [], unread: 0 });
    const button = await screen.findByRole('button', { name: 'Ada' });
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull());
    expect(document.activeElement).toBe(button);
  });
});
