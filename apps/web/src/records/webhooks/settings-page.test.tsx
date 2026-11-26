// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { Toaster } from '@kronaut/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { LocaleContext } from '../../base/locale/context.ts';
import { WebhookSettingsPage } from './settings-page.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const STAMP = '2026-11-26T10:00:00.000Z';
const SECRET = 'whsec_c2VjcmV0LXNob3duLW9uY2U=';
const BASE = '/v1/workspaces/ws_1/webhooks';

function endpoint(id: string, url: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    url,
    description: null,
    events: ['destination.failed'],
    enabled: true,
    disabledReason: null,
    consecutiveFailures: 0,
    failingSince: null,
    previousSecretExpiresAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  };
}

type Row = ReturnType<typeof endpoint>;

function mount(endpoints: Row[]) {
  const calls: string[] = [];
  const fetch = async (raw: Request | URL | string) => {
    const request = raw as Request;
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/v1/me') return Response.json(ME);
    if (request.method === 'GET' && path === BASE) return Response.json({ items: endpoints });
    if (request.method === 'GET') {
      return Response.json({ items: [], nextCursor: null });
    }
    const text = await request.text();
    calls.push(`${request.method} ${path.replace(BASE, '')} ${text}`);
    if (path.endsWith('/test')) {
      return Response.json(
        { error: { code: 'rate_limited', message: '', details: [] } },
        { status: 429 },
      );
    }
    const body = JSON.parse(text);
    if (body.url === 'http://insecure.example') {
      const details = [{ path: 'body.url', code: 'url_invalid' }];
      return Response.json(
        { error: { code: 'unprocessable', message: '', details } },
        { status: 422 },
      );
    }
    const created = endpoint('whk_new', body.url, { events: body.events });
    endpoints.push(created);
    return Response.json({ ...created, secret: SECRET }, { status: 201 });
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <LocaleContext.Provider value={{ locale: 'en', choose: () => undefined }}>
          <WebhookSettingsPage />
          <Toaster dismissLabel="Dismiss" />
        </LocaleContext.Provider>
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return calls;
}

describe('webhook settings', () => {
  it('creates an endpoint in a modal and shows its secret once', async () => {
    const calls = mount([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add endpoint' }));
    const dialog = screen.getByRole('dialog', { name: 'Add endpoint' });
    expect(within(dialog).queryByText('Test event')).toBeNull();
    fireEvent.change(within(dialog).getByLabelText('Endpoint URL'), {
      target: { value: 'http://insecure.example' },
    });
    fireEvent.click(within(dialog).getByLabelText(/Post approved/));
    fireEvent.click(within(dialog).getByLabelText(/Failed on a channel/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/Use an https address/)).toBeDefined();

    fireEvent.change(within(dialog).getByLabelText('Endpoint URL'), {
      target: { value: ' https://hooks.example.com/in ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    const secret = await screen.findByRole('dialog', { name: 'Signing secret' });
    expect(secret.textContent).toContain(SECRET);
    expect(secret.textContent).toContain("You won't see it again.");
    fireEvent.click(within(secret).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByText(SECRET)).toBeNull());
    expect(await screen.findByText('hooks.example.com')).toBeDefined();
    expect(calls).toEqual([
      'POST  {"url":"http://insecure.example","events":["destination.failed","post.approved"]}',
      'POST  {"url":"https://hooks.example.com/in","events":["destination.failed","post.approved"]}',
    ]);
  });

  it('explains an endpoint turned off for failing and the test limit', async () => {
    mount([
      endpoint('whk_1', 'https://down.example.com/in', {
        enabled: false,
        disabledReason: 'failing',
      }),
      endpoint('whk_2', 'https://up.example.com/in'),
    ]);
    expect(await screen.findByText(/turned off because its deliveries kept failing/)).toBeDefined();
    expect(screen.getAllByText(/kept failing/)).toHaveLength(1);
    const sendDown = screen.getByRole('button', { name: 'Send a test event to down.example.com' });
    expect((sendDown as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Send a test event to up.example.com' }));
    expect(await screen.findByText(/too many test events/)).toBeDefined();
  });
});
