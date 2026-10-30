// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';
import { safeNext } from '../next.ts';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const SIGNED_IN: Readonly<Record<string, object>> = {
  '/v1/me': ME,
  '/v1/workspaces/ws_1/posts': { items: [], truncated: false },
  '/v1/workspaces/ws_1/channels': { items: [] },
  '/v1/workspaces/ws_1/tags': { items: [] },
  '/v1/workspaces/ws_1/needs-action': { items: [], total: 0, truncated: false },
  '/v1/workspaces/ws_1/notifications': { items: [], unread: 0 },
};

describe('login', () => {
  it('redirects a 401 to /login with a same-origin next, then signs in', async () => {
    let signedIn = false;
    const calls: string[] = [];
    const client = createApiClient({
      baseUrl: 'http://kronaut.test',
      fetch: async (input) => {
        const request = input as Request;
        const path = new URL(request.url).pathname;
        calls.push(`${request.method} ${path}`);
        if (path === '/v1/auth/login') {
          signedIn = true;
          return Response.json({ userId: 'usr_1' });
        }
        const body = signedIn ? SIGNED_IN[path] : undefined;
        if (body !== undefined) return Response.json(body);
        return Response.json(
          { error: { code: 'unauthenticated', message: 'Authentication is required.' } },
          { status: 401 },
        );
      },
    });
    const history = createMemoryHistory({ initialEntries: ['/?view=week'] });
    const { router, queryClient } = createApp(client, history);
    render(<App router={router} queryClient={queryClient} client={client} />);

    await screen.findByRole('heading', { name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ next: '/?view=week' });
    expect(
      ['//evil.test/x', 'https://evil.test/', '/\\evil.test', 'javascript:alert(1)'].map(safeNext),
    ).toEqual(['/', '/', '/', '/']);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('table');
    expect(router.state.location.href).toBe('/?view=week');
    expect(screen.getByText('Studio')).toBeDefined();
    expect(calls).toContain('POST /v1/auth/login');
  });
});
