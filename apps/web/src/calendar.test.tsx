// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Temporal } from 'temporal-polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, createApp } from './app.tsx';

vi.mock('./calendar/time.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./calendar/time.ts')>()),
  browserTimeZone: () => 'Europe/Bratislava',
  browserLanguage: () => 'en-US',
  today: () => Temporal.PlainDate.from('2026-10-01'),
  currentInstant: () => Temporal.Instant.from('2026-10-01T10:00:00Z'),
}));

afterEach(cleanup);

function me(locale: string) {
  return {
    user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale },
    workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
  };
}

function destination(id: string, provider: string, state: string, scheduledAt: string) {
  return {
    id,
    accountId: `acct_${id}`,
    provider,
    publishType: 'post',
    state,
    scheduledAt,
    publishedAt: null,
    remoteUrl: null,
    lastErrorCode: null,
  };
}

function summary(destinations: ReturnType<typeof destination>[]) {
  return {
    id: 'post_1',
    version: 3,
    title: null,
    publishSummary: 'scheduled',
    tags: [],
    scheduleMode: 'instant',
    scheduleLocal: '2026-10-13T09:30:00',
    scheduleTz: 'Europe/Bratislava',
    updatedAt: '2026-10-01T08:00:00.000Z',
    excerpt: 'Hello calendar',
    mediaCount: 0,
    destinations,
  };
}

function mount(locale: string, url: string, items: unknown[]) {
  const ranges: { from: string; to: string }[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = new URL((input as Request).url);
      if (request.pathname === '/v1/me') return Response.json(me(locale));
      if (request.pathname === '/v1/workspaces/ws_1/posts') {
        const from = request.searchParams.get('from');
        const to = request.searchParams.get('to');
        if (from === null || to === null) return Response.json({ items: [], truncated: false });
        ranges.push({ from, to });
        return Response.json({ items, truncated: false });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(client, createMemoryHistory({ initialEntries: [url] }));
  render(<App router={router} queryClient={queryClient} client={client} />);
  return ranges;
}

describe('calendar', () => {
  it('renders one linked chip per destination and asks for the zoned week', async () => {
    const ranges = mount('en', '/?view=week&date=2026-10-14', [
      summary([
        destination('a', 'bluesky', 'scheduled', '2026-10-13T07:30:00.000Z'),
        destination('b', 'instagram', 'failed', '2026-10-13T08:00:00.000Z'),
      ]),
    ]);
    const chips = await screen.findAllByRole('link', { name: /Hello calendar/ });
    expect(chips.map((chip) => chip.getAttribute('href'))).toEqual([
      '/posts/post_1',
      '/posts/post_1',
    ]);
    expect(chips[0]?.getAttribute('aria-label')).toMatch(/^9:30\sAM GMT\+2, Bluesky, Scheduled: /);
    expect(chips[1]?.getAttribute('aria-label')).toMatch(/Instagram, Failed: /);
    expect(ranges.at(-1)).toEqual({ from: '2026-10-10T22:00:00Z', to: '2026-10-17T22:00:00Z' });
  });

  it('starts a cs week on Monday with a 24 h clock across the DST change', async () => {
    const ranges = mount('cs', '/?view=week&date=2026-10-22', [
      summary([
        destination('a', 'bluesky', 'scheduled', '2026-10-20T13:05:00.000Z'),
        destination('b', 'bluesky', 'scheduled', '2026-10-25T13:05:00.000Z'),
      ]),
    ]);
    const chips = await screen.findAllByRole('link', { name: /Hello calendar/ });
    expect(chips.map((chip) => chip.getAttribute('aria-label')?.split(',')[0])).toEqual([
      '14:05 SEČ',
      '15:05 SELČ',
    ]);
    const days = screen.getAllByRole('columnheader').map((h) => h.getAttribute('aria-label'));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('pondělí 19. října');
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toContain('14:00');
    await waitFor(() => expect(ranges.at(-1)?.from).toBe('2026-10-18T22:00:00Z'));
    const range = ranges.at(-1);
    expect(range?.to).toBe('2026-10-25T23:00:00Z');
    expect((Date.parse(range?.to ?? '') - Date.parse(range?.from ?? '')) / 3_600_000).toBe(169);
  });

  it('shows the month view overflow with a plural form', async () => {
    mount('sk', '/?view=month&date=2026-10-10', [
      summary(
        ['a', 'b', 'c', 'd', 'e'].map((id, index) =>
          destination(id, 'bluesky', 'scheduled', `2026-10-14T0${index + 1}:00:00.000Z`),
        ),
      ),
    ]);
    const more = await screen.findByRole('link', { name: '+2 ďalšie' });
    expect(more.getAttribute('href')).toBe('/?view=week&date=2026-10-14');
    expect(screen.getAllByRole('link', { name: /Hello calendar/ })).toHaveLength(3);
  });
});

type Summary = ReturnType<typeof summary>;
type Handler = (request: Request) => Promise<Response> | undefined;

interface Moved {
  readonly key: string | null;
  readonly body: { expectedVersion: number; scheduleLocal: string; scheduleTz: string };
}

function fakeServer(post: Summary) {
  const calls: Moved[] = [];
  let current = post;
  let hold: Promise<void> = Promise.resolve();
  let fail: Response | null = null;
  const handle: Handler = (request) => {
    if (!request.url.endsWith('/v1/workspaces/ws_1/posts/post_1/reschedule')) return undefined;
    return (async () => {
      const body = (await request.clone().json()) as Moved['body'];
      calls.push({ key: request.headers.get('Idempotency-Key'), body });
      await hold;
      if (fail !== null) return fail;
      const at = Temporal.PlainDateTime.from(body.scheduleLocal)
        .toZonedDateTime(body.scheduleTz)
        .toInstant();
      current = {
        ...current,
        version: current.version + 2,
        scheduleLocal: body.scheduleLocal,
        destinations: current.destinations.map((d) => ({
          ...d,
          scheduledAt: new Date(at.epochMilliseconds).toISOString(),
        })),
      };
      return Response.json({
        ...current,
        items: [],
        createdAt: current.updatedAt,
        destinations: current.destinations.map((d) => ({
          ...d,
          deliveryMode: 'auto',
          settings: {},
          stateReason: null,
          version: 2,
        })),
      });
    })();
  };
  return {
    calls,
    handle,
    items: () => [current],
    holdUntil(gate: Promise<void>) {
      hold = gate;
    },
    failWith(response: Response) {
      fail = response;
    },
  };
}

function mountMoving(server: ReturnType<typeof fakeServer>) {
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const handled = server.handle(request);
      if (handled !== undefined) return await handled;
      const path = new URL(request.url);
      if (path.pathname === '/v1/me') return Response.json(me('en'));
      const ranged = path.searchParams.has('from');
      return Response.json({ items: ranged ? server.items() : [], truncated: false });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/?view=week&date=2026-10-14'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
}

function cells(prefix: string): HTMLElement[] {
  return screen
    .getAllByRole('cell')
    .filter((cell) => cell.getAttribute('aria-label')?.startsWith(prefix));
}

function slot(label: RegExp): HTMLElement {
  const cell = screen
    .getAllByRole('cell')
    .find((c) => label.test(c.getAttribute('aria-label') ?? ''));
  const target = cell?.querySelector<HTMLElement>('[data-slot]');
  if (target == null) throw new Error(`no slot ${label}`);
  return target;
}

function chipsOn(prefix: string): HTMLElement[] {
  return cells(prefix).flatMap((cell) =>
    within(cell).queryAllByRole('link', { name: /Hello calendar/ }),
  );
}

const MOVABLE = summary([
  destination('a', 'bluesky', 'scheduled', '2026-10-13T07:30:00.000Z'),
  destination('b', 'instagram', 'scheduled', '2026-10-13T07:30:00.000Z'),
]);

describe('calendar moves', () => {
  it('drags a post to the next day, keeping its time of day, before the server answers', async () => {
    const server = fakeServer(MOVABLE);
    let release = () => {};
    server.holdUntil(new Promise((resolve) => (release = resolve)));
    mountMoving(server);
    const [chip] = await screen.findAllByRole('link', { name: /Hello calendar/ });
    if (chip === undefined) throw new Error('no chip');
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'all', dropEffect: 'none' };
    fireEvent.dragStart(chip, { dataTransfer });
    const target = slot(/^Wednesday, October 14 at 9:00/);
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    await waitFor(() => expect(server.calls).toHaveLength(1));
    expect(server.calls[0]?.body).toEqual({
      expectedVersion: 3,
      scheduleLocal: '2026-10-14T09:30:00',
      scheduleTz: 'Europe/Bratislava',
    });
    expect(server.calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(chipsOn('Wednesday, October 14')).toHaveLength(2));
    expect(chipsOn('Tuesday, October 13')).toHaveLength(0);
    release();
  });

  it('moves a focused chip a day with Shift+ArrowRight and undoes it from the toast', async () => {
    const server = fakeServer(MOVABLE);
    mountMoving(server);
    const [chip] = await screen.findAllByRole('link', { name: /Hello calendar/ });
    if (chip === undefined) throw new Error('no chip');
    chip.focus();
    fireEvent.keyDown(chip, { key: 'ArrowRight', shiftKey: true });

    const undo = await screen.findByRole('button', { name: 'Undo' });
    expect(server.calls[0]?.body.scheduleLocal).toBe('2026-10-14T09:30:00');
    expect(screen.getByRole('status').textContent).toMatch(
      /^Moved to Oct 14, 2026, 9:30\sAM GMT\+2/,
    );
    expect(document.activeElement?.closest('td')?.getAttribute('aria-label')).toMatch(
      /^Wednesday, October 14 at 9:00/,
    );
    fireEvent.click(undo);

    await waitFor(() => expect(server.calls).toHaveLength(2));
    expect(server.calls[1]?.body).toEqual({
      expectedVersion: 5,
      scheduleLocal: '2026-10-13T09:30:00',
      scheduleTz: 'Europe/Bratislava',
    });
    expect(server.calls[1]?.key).not.toBe(server.calls[0]?.key);
    await waitFor(() => expect(chipsOn('Tuesday, October 13')).toHaveLength(2));
  });

  it('rolls a refused move back and says why in the active language', async () => {
    const server = fakeServer(MOVABLE);
    server.failWith(
      Response.json(
        {
          error: {
            code: 'unprocessable',
            message: 'The post could not be saved.',
            details: [{ path: 'body.scheduleLocal', code: 'in_past' }],
          },
        },
        { status: 422 },
      ),
    );
    mountMoving(server);
    const [chip] = await screen.findAllByRole('link', { name: /Hello calendar/ });
    if (chip === undefined) throw new Error('no chip');
    fireEvent.keyDown(chip, { key: 'ArrowRight', shiftKey: true });

    expect((await screen.findByRole('alert')).textContent).toContain(
      'That time has already passed. Pick a later day.',
    );
    expect(chipsOn('Tuesday, October 13')).toHaveLength(2);
    expect(chipsOn('Wednesday, October 14')).toHaveLength(0);
    expect(server.calls).toHaveLength(1);
  });
});
