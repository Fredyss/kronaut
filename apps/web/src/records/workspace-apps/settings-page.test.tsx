// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { WorkspaceAppSettingsPage } from './settings-page.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const STAMP = '2026-11-26T10:00:00.000Z';

interface App {
  provider: string;
  clientId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function mount(apps: App[]) {
  const calls: string[] = [];
  const fetch = async (raw: Request | URL | string) => {
    const request = raw as Request;
    const path = new URL(request.url).pathname;
    if (path === '/v1/me') return Response.json(ME);
    if (request.method === 'GET') return Response.json({ items: apps, supported: ['x_com'] });
    const body =
      request.method === 'POST' && path.endsWith('/disable') ? null : await request.json();
    calls.push(
      `${request.method} ${path.replace('/v1/workspaces/ws_1/provider-apps', '')} ${JSON.stringify(body)}`,
    );
    if (path.endsWith('/disable')) {
      apps.splice(0, 1, { ...(apps[0] as App), status: 'disabled' });
      return new Response(null, { status: 204 });
    }
    if (path.endsWith('/secret')) {
      apps.splice(0, 1, { ...(apps[0] as App), status: 'active' });
      return Response.json(apps[0]);
    }
    if (body.clientId === 'taken') {
      const details = [{ path: 'body.clientId', code: 'client_id_taken' }];
      return Response.json({ error: { code: 'conflict', message: '', details } }, { status: 409 });
    }
    const app = {
      provider: 'x_com',
      clientId: body.clientId,
      status: 'active',
      createdAt: STAMP,
      updatedAt: STAMP,
    };
    apps.unshift(app);
    return Response.json(app, { status: 201 });
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <WorkspaceAppSettingsPage />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return calls;
}

function type(name: string, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

describe('workspace app settings', () => {
  it('shows the callback URL and registers an app, with a taken client id at its field', async () => {
    const calls = mount([]);
    const callback = await screen.findByRole('textbox', { name: 'Callback URL' });
    expect((callback as HTMLInputElement).value).toBe(
      `${window.location.origin}/v1/oauth/x_com/callback`,
    );
    type('Client ID', 'taken');
    type('Client secret', 'shh');
    fireEvent.click(screen.getByRole('button', { name: 'Register app' }));
    expect(
      await screen.findByText('This client ID is already registered on this server.'),
    ).toBeDefined();

    type('Client ID', ' own-client ');
    fireEvent.click(screen.getByRole('button', { name: 'Register app' }));
    expect(await screen.findByText('own-client')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
    expect(calls).toEqual([
      'POST  {"provider":"x_com","clientId":"taken","clientSecret":"shh"}',
      'POST  {"provider":"x_com","clientId":"own-client","clientSecret":"shh"}',
    ]);
  });

  it('warns about a misconfigured app, replaces its secret and disables it', async () => {
    const calls = mount([
      {
        provider: 'x_com',
        clientId: 'own-client',
        status: 'misconfigured',
        createdAt: STAMP,
        updatedAt: STAMP,
      },
    ]);
    expect(await screen.findByText('Needs attention')).toBeDefined();
    expect(screen.getByText(/X refused this app's credentials/)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Replace secret' }));
    type('New client secret', 'fresh');
    fireEvent.click(screen.getByRole('button', { name: 'Save secret' }));
    expect(await screen.findByText('Active')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Disable app' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Disable this app?' });
    expect(dialog.textContent).toContain('stop publishing until you reconnect them');
    fireEvent.click(screen.getAllByRole('button', { name: 'Disable app' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Register app' })).toBeDefined());
    expect(calls).toEqual([
      'PUT /x_com/secret {"clientSecret":"fresh"}',
      'POST /x_com/disable null',
    ]);
  });
});
