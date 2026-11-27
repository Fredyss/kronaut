// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { Toaster } from '@kronaut/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { LocaleContext } from '../../base/locale/context.ts';
import { ApiKeySettingsPage } from './settings-page.tsx';

afterEach(cleanup);

const ME = {
  instanceAdmin: false,
  user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const STAMP = '2026-11-26T10:00:00.000Z';
const TOKEN = 'kro_grt_new_CANARY_shown_once';
const BASE = '/v1/workspaces/ws_1/grants';

type Row = Readonly<Record<string, unknown> & { id: string; name: string }>;

function apiKey(id: string, name: string, extra: Record<string, unknown> = {}): Row {
  return {
    id,
    kind: 'api_key',
    name,
    status: 'active',
    scopes: ['posts:read'],
    resourceScope: 'workspace',
    access: null,
    tokenPrefix: `kro_${id}`,
    rateLimitPerMinute: null,
    sponsorId: 'usr_1',
    expiresAt: null,
    revokedAt: null,
    createdAt: STAMP,
    ...extra,
  };
}

function created(body: Record<string, unknown>) {
  return apiKey('grt_new', String(body.name), {
    scopes: body.scopes,
    resourceScope: body.resourceScope,
    access: body.access ?? null,
  });
}

async function write(request: Request, keys: Row[], path: string): Promise<Response> {
  if (path.endsWith('/revoke')) {
    const id = path.slice(BASE.length + 1, -'/revoke'.length);
    const index = keys.findIndex((key) => key.id === id);
    keys[index] = { ...apiKey(id, keys[index]?.name ?? ''), status: 'revoked', revokedAt: STAMP };
    return new Response(null, { status: 204 });
  }
  const body = JSON.parse(await request.clone().text());
  if (body.name === 'taken') {
    const details = [{ path: 'body.expiresAt', code: 'in_past' }];
    return Response.json(
      { error: { code: 'unprocessable', message: '', details } },
      { status: 422 },
    );
  }
  const key = created(body);
  keys.unshift(key);
  return Response.json({ ...key, token: TOKEN }, { status: 201 });
}

function mount(keys: Row[]) {
  const calls: string[] = [];
  const fetch = async (raw: Request | URL | string) => {
    const request = raw as Request;
    const path = new URL(request.url).pathname;
    if (path === '/v1/me') return Response.json(ME);
    if (path === BASE && request.method === 'GET')
      return Response.json({ items: keys, nextCursor: null });
    if (request.method === 'GET') return Response.json({ items: [] });
    calls.push(`${request.method} ${path.replace(BASE, '')} ${await request.clone().text()}`);
    return write(request, keys, path);
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <LocaleContext.Provider value={{ locale: 'en', choose: () => undefined }}>
          <ApiKeySettingsPage />
          <Toaster dismissLabel="Dismiss" />
        </LocaleContext.Provider>
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return calls;
}

describe('API key settings', () => {
  it('creates a key in a modal and shows its token once', async () => {
    const calls = mount([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Create API key' }));
    const dialog = screen.getByRole('dialog', { name: 'Create API key' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'taken' } });
    fireEvent.click(within(dialog).getByLabelText(/Schedule posts/));
    fireEvent.click(within(dialog).getByLabelText(/See posts/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Choose a day in the future.')).toBeDefined();

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: ' Zapier ' } });
    fireEvent.click(within(dialog).getByLabelText('Only the brands and channels I choose'));
    expect(within(dialog).getByText(/would reach no brand and no channel/)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText(/Requests a minute/), {
      target: { value: '120' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create key' }));
    const token = await screen.findByRole('dialog', { name: 'API key' });
    expect(token.textContent).toContain(TOKEN);
    expect(token.textContent).toContain("You won't see it again.");
    expect(token.textContent).toContain('Authorization: Bearer <token>');
    fireEvent.click(within(token).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByText(TOKEN)).toBeNull());
    expect(await screen.findByText('Zapier')).toBeDefined();
    expect(screen.getByText(/Restricted, reaches nothing/)).toBeDefined();
    const access = '"access":{"brandIds":[],"locationIds":[],"accountIds":[]}';
    expect(calls).toEqual(
      [
        ' {"name":"taken","scopes":["posts:read","posts:schedule"],"resourceScope":"workspace","expiresAt":null,"rateLimitPerMinute":null}',
        ` {"name":"Zapier","scopes":["posts:read","posts:schedule"],"resourceScope":"restricted",${access},"expiresAt":null,"rateLimitPerMinute":120}`,
      ].map((call) => `POST ${call}`),
    );
  });

  it('revokes a key after confirming and keeps it listed as revoked', async () => {
    const calls = mount([apiKey('grt_1', 'CI bot')]);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke CI bot' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Revoke this API key?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByText('Revoked')).toBeDefined();
    expect(screen.getByText('CI bot')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Revoke CI bot' })).toBeNull();
    expect(calls).toEqual(['POST /grt_1/revoke ']);
  });
});
