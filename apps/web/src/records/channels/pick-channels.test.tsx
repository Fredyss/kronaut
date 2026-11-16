// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../../app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};
const PICK = 'p'.repeat(43);
const SELECTION = `/v1/workspaces/ws_1/channels/selections/${PICK}`;
const ITEMS = [
  { id: '10', displayName: '#general', handle: 'Ada Lounge' },
  { id: '20', displayName: '#news', handle: 'Ada Lounge' },
  { id: '30', displayName: '#offtopic', handle: null },
];

interface Call {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly key: string | null;
}

type Respond = () => Response;

async function answer(request: Request, calls: Call[], selection: Respond): Promise<Response> {
  const path = new URL(request.url).pathname;
  const body = request.method === 'POST' ? await request.json() : undefined;
  calls.push({ method: request.method, path, body, key: request.headers.get('idempotency-key') });
  if (request.method === 'GET') return selection();
  if (request.method === 'DELETE') return new Response(null, { status: 204 });
  return Response.json({ connected: ['acct_1', 'acct_2'] });
}

function mount(selection: Respond = () => Response.json({ provider: 'x', items: ITEMS })) {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;
      if (path === '/v1/me') return Response.json(ME);
      if (path === '/v1/workspaces/ws_1/channels') return Response.json({ items: [] });
      if (path === '/v1/workspaces/ws_1/channels/providers') return Response.json({ items: [] });
      if (path.startsWith(SELECTION)) return await answer(request, calls, selection);
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: [`/channels?pick=${PICK}`] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { router, calls };
}

describe('channel picker', () => {
  it('lists the offered channels unticked and connects only the ticked ones', async () => {
    const { router, calls } = mount();
    const dialog = await screen.findByRole('dialog', { name: 'Choose channels to connect' });
    await within(dialog).findByText('#general');
    const boxes = within(dialog).getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([false, false, false]);
    const none = within(dialog).getByRole('button', { name: 'Connect 0 channels' });
    expect(none.hasAttribute('disabled')).toBe(true);

    fireEvent.click(within(dialog).getByLabelText(/#general/));
    fireEvent.click(within(dialog).getByLabelText(/#offtopic/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Connect 2 channels' }));

    await screen.findByText('2 channels are connected.');
    const confirm = calls.find((call) => call.method === 'POST');
    expect(confirm).toMatchObject({
      path: `${SELECTION}/confirm`,
      body: { accounts: ['10', '30'] },
    });
    expect(confirm?.key).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('discards the selection on cancel', async () => {
    const { router, calls } = mount();
    const dialog = await screen.findByRole('dialog', { name: 'Choose channels to connect' });
    await within(dialog).findByText('#news');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(calls.map((call) => call.method)).toEqual(['GET', 'DELETE']);
  });

  it('says when the selection expired', async () => {
    const expired = () =>
      Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    const { router, calls } = mount(expired);
    const dialog = await screen.findByRole('dialog', { name: 'Choose channels to connect' });
    await within(dialog).findByText('This selection expired. Connect again to choose channels.');
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(calls.map((call) => call.method)).toEqual(['GET']);
  });
});
