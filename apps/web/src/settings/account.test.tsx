// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';
import { COLD, warmUp } from '../compose/testing.tsx';
import { useLocaleChoice } from '../locale-choice.ts';
import { chooseTheme } from '../theme.tsx';

afterEach(() => {
  cleanup();
  chooseTheme('system');
});

const ME = {
  user: { id: 'usr_1', displayName: null, email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

interface Sent {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

type Reply = (sent: Sent) => Response | undefined;

function failure(status: number, code: string, details?: readonly object[]): Response {
  return Response.json({ error: { code, message: '', details } }, { status });
}

function echo({ path, body }: Sent): Response | undefined {
  if (path === '/v1/me') {
    const changes = body as { displayName?: string | null };
    return Response.json({
      user: { ...ME.user, ...changes, displayName: changes.displayName || null },
    });
  }
  if (path === '/v1/auth/password/change') return new Response(null, { status: 204 });
  return undefined;
}

function mount(path: string, reply: Reply = echo) {
  const sent: Sent[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url).pathname;
      if (request.method !== 'GET') {
        const call = { method: request.method, path: url, body: await request.json() };
        sent.push(call);
        return reply(call) ?? failure(500, 'internal');
      }
      if (url === '/v1/me') return Response.json(ME);
      if (url === '/v1/workspaces/ws_1/notification-preferences') {
        return Response.json({ email: { failures: true, approvals: true, channels: true } });
      }
      return failure(404, 'not_found');
    },
  });
  const history = createMemoryHistory({ initialEntries: [path] });
  const { router, queryClient } = createApp(client, history);
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { history, sent };
}

async function region(name: string): Promise<HTMLElement> {
  return await screen.findByRole('region', { name });
}

async function warmSection(path: string, name: string) {
  mount(path);
  await screen.findByRole('heading', { name, level: 2 }, COLD);
}

warmUp(
  () => warmSection('/settings/account', 'Account'),
  () => warmSection('/settings/notifications', 'Notifications'),
  () => warmSection('/settings/approvals', 'Approvals'),
);

describe('settings', () => {
  it('redirects /settings to the account section', async () => {
    const { history } = mount('/settings');
    expect(await screen.findByRole('heading', { name: 'Account', level: 2 })).toBeDefined();
    expect(history.location.pathname).toBe('/settings/account');
  });

  it('switches pages from the section nav', async () => {
    mount('/settings/account');
    const nav = await screen.findByRole('navigation', { name: 'Settings sections' });
    const account = within(nav).getByRole('link', { name: 'Account' });
    expect(account.getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(nav).getByRole('link', { name: 'Notifications' }));
    expect(await screen.findByRole('heading', { name: 'Notifications', level: 2 })).toBeDefined();
    expect(
      within(nav).getByRole('link', { name: 'Notifications' }).getAttribute('aria-current'),
    ).toBe('page');
    fireEvent.click(within(nav).getByRole('link', { name: 'Approvals' }));
    expect(await screen.findByRole('heading', { name: 'Approvals', level: 2 })).toBeDefined();
  });

  it('changes the theme in the same store as the header toggle', async () => {
    mount('/settings/account');
    const select = within(await region('Preferences')).getByLabelText('Theme');
    fireEvent.change(select, { target: { value: 'dark' } });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('kronaut.theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Theme: dark' }));
    expect((select as HTMLSelectElement).value).toBe('system');
  });
});

describe('display name', () => {
  it('saves a changed name, updates the header and clears it with null', async () => {
    const { sent } = mount('/settings/account');
    const profile = await region('Profile');
    expect(within(profile).getByText('ada@example.test')).toBeDefined();
    const input = within(profile).getByLabelText('Name') as HTMLInputElement;
    const save = within(profile).getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '  ' } });
    expect(save.disabled).toBe(true);
    fireEvent.change(input, { target: { value: ' Grace ' } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(await screen.findByRole('button', { name: 'Grace' })).toBeDefined();
    expect(await screen.findByText('Name saved.')).toBeDefined();
    expect(sent).toEqual([{ method: 'PATCH', path: '/v1/me', body: { displayName: 'Grace' } }]);
    expect(input.value).toBe('Grace');
    expect(save.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(save);
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]?.body).toEqual({ displayName: null });
    expect(await screen.findByRole('button', { name: 'ada@example.test' })).toBeDefined();
  });

  it('keeps the typed name and says so when saving fails', async () => {
    mount('/settings/account', () => failure(500, 'internal'));
    const input = within(await region('Profile')).getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Your name wasn't saved. Try again.")).toBeDefined();
    expect(input.value).toBe('Grace');
  });
});

describe('language', () => {
  it('saves the chosen language to the account', async () => {
    const { sent } = mount('/settings/account');
    const select = within(await region('Preferences')).getByLabelText('Language');
    fireEvent.change(select, { target: { value: 'sk' } });
    expect(await screen.findByRole('heading', { name: 'Nastavenia', level: 1 })).toBeDefined();
    await waitFor(() => expect(document.documentElement.lang).toBe('sk'));
    expect(sent).toEqual([{ method: 'PATCH', path: '/v1/me', body: { locale: 'sk' } }]);
  });

  it('switches back and says so when saving fails', async () => {
    mount('/settings/account', () => failure(500, 'internal'));
    const select = within(await region('Preferences')).getByLabelText('Language');
    fireEvent.change(select, { target: { value: 'sk' } });
    expect(await screen.findByText('Jazyk sa neuložil. Skúste to znova.')).toBeDefined();
    expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeDefined();
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  it('keeps a signed-out choice in the browser without a request', () => {
    const calls: string[] = [];
    const client = createApiClient({
      baseUrl: 'http://kronaut.test',
      fetch: async (input) => {
        calls.push((input as Request).url);
        return failure(401, 'unauthenticated');
      },
    });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLocaleChoice(client), { wrapper });
    act(() => result.current.choose('cs'));
    expect(result.current.wanted).toBe('cs');
    expect(calls).toEqual([]);
  });
});

async function openPasswordForm(): Promise<HTMLElement> {
  const card = await region('Password');
  fireEvent.click(within(card).getByRole('button', { name: 'Change password' }));
  return card;
}

function fill(card: HTMLElement, current: string, next: string, repeat = next): void {
  const set = (label: string, value: string) =>
    fireEvent.change(within(card).getByLabelText(label), { target: { value } });
  set('Current password', current);
  set('New password', next);
  set('Repeat new password', repeat);
  fireEvent.click(within(card).getByRole('button', { name: 'Save' }));
}

function problemOf(card: HTMLElement, label: string): string | null {
  const input = within(card).getByLabelText(label);
  if (input.getAttribute('aria-invalid') !== 'true') return null;
  const note = document.getElementById(input.getAttribute('aria-describedby') ?? '');
  return note?.textContent ?? null;
}

const DETAIL = (path: string, code: string) => [{ path, code }];

describe('password', () => {
  it('catches a mismatch and a short password without a request', async () => {
    const { sent } = mount('/settings/account');
    const card = await openPasswordForm();
    fill(card, 'old password', 'too short', 'different');
    expect(problemOf(card, 'New password')).toBe('Use at least 12 characters.');
    expect(problemOf(card, 'Repeat new password')).toBe("The passwords don't match.");
    expect(problemOf(card, 'Current password')).toBeNull();
    expect(sent).toEqual([]);
  });

  it('changes the password, collapses the form and says so', async () => {
    const { sent } = mount('/settings/account');
    const card = await openPasswordForm();
    fill(card, 'old password', 'a much longer secret');
    expect(
      await screen.findByText('Password changed. Other devices were signed out.'),
    ).toBeDefined();
    expect(sent).toEqual([
      {
        method: 'POST',
        path: '/v1/auth/password/change',
        body: { currentPassword: 'old password', newPassword: 'a much longer secret' },
      },
    ]);
    expect(within(card).queryByLabelText('Current password')).toBeNull();
    expect(within(card).getByRole('button', { name: 'Change password' })).toBeDefined();
  });

  it('shows a wrong current password on its field', async () => {
    mount('/settings/account', () =>
      failure(422, 'unprocessable', DETAIL('body.currentPassword', 'incorrect')),
    );
    const card = await openPasswordForm();
    fill(card, 'wrong password', 'a much longer secret');
    await waitFor(() =>
      expect(problemOf(card, 'Current password')).toBe('The current password is incorrect.'),
    );
  });

  it('explains that two-factor accounts cannot change it yet', async () => {
    mount('/settings/account', () =>
      failure(422, 'unprocessable', DETAIL('body.currentPassword', 'two_factor_unavailable')),
    );
    const card = await openPasswordForm();
    fill(card, 'old password', 'a much longer secret');
    expect((await within(card).findByRole('alert')).textContent).toBe(
      "Changing the password isn't available yet for accounts with two-factor sign-in.",
    );
  });
});
