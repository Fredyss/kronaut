// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'editor', canApprove: false }],
};

const PATH = '/v1/workspaces/ws_1/notification-preferences';

const STORED = { failures: true, approvals: false, channels: true };

interface Put {
  readonly body: unknown;
  readonly key: string | null;
}

function mount(reply: (body: unknown) => Response | Promise<Response>) {
  const puts: Put[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url).pathname;
      if (url === '/v1/me') return Response.json(ME);
      if (url === PATH && request.method === 'GET') return Response.json({ email: STORED });
      if (url === PATH && request.method === 'PUT') {
        const body = await request.json();
        puts.push({ body, key: request.headers.get('Idempotency-Key') });
        return await reply(body);
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/settings/notifications'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return puts;
}

function held() {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release() };
}

function checked(name: string): string | null {
  return screen.getByRole('switch', { name }).getAttribute('aria-checked');
}

describe('notification settings', () => {
  it('loads the three email preferences', async () => {
    mount(() => Response.json({ email: STORED }));
    await screen.findByRole('switch', { name: 'Failures' });
    expect(checked('Failures')).toBe('true');
    expect(checked('Approvals')).toBe('false');
    expect(checked('Channel problems')).toBe('true');
    expect(screen.getByText('In-app notifications always show in the bell.')).toBeDefined();
  });

  it('flips a switch at once and saves all three values with an idempotency key', async () => {
    const { gate, release } = held();
    const puts = mount(async (body) => {
      await gate;
      return Response.json(body);
    });
    fireEvent.click(await screen.findByRole('switch', { name: 'Approvals' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    await waitFor(() => expect(checked('Approvals')).toBe('true'));
    release();
    expect(puts[0]?.body).toEqual({ email: { ...STORED, approvals: true } });
    expect(puts[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(checked('Approvals')).toBe('true'));
  });

  it('saves overlapping toggles one after the other without undoing either', async () => {
    const { gate, release } = held();
    const puts = mount(async (body) => {
      await gate;
      return Response.json(body);
    });
    fireEvent.click(await screen.findByRole('switch', { name: 'Approvals' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    fireEvent.click(screen.getByRole('switch', { name: 'Channel problems' }));
    await waitFor(() => expect(checked('Channel problems')).toBe('false'));
    expect(puts).toHaveLength(1);
    release();
    await waitFor(() => expect(puts).toHaveLength(2));
    expect(puts[1]?.body).toEqual({ email: { failures: true, approvals: true, channels: false } });
    expect(puts[1]?.key).not.toBe(puts[0]?.key);
    expect(checked('Approvals')).toBe('true');
    expect(checked('Channel problems')).toBe('false');
  });

  it('rolls back and says so when saving fails', async () => {
    const { gate, release } = held();
    const puts = mount(async () => {
      await gate;
      return Response.json({ error: { code: 'internal', message: '' } }, { status: 500 });
    });
    fireEvent.click(await screen.findByRole('switch', { name: 'Failures' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    await waitFor(() => expect(checked('Failures')).toBe('false'));
    release();
    expect(
      await screen.findByText("Your notification settings weren't saved. Try again."),
    ).toBeDefined();
    expect(checked('Failures')).toBe('true');
    expect(puts).toHaveLength(1);
  });
});
