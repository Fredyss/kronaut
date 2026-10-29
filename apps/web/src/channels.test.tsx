// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, createApp } from './app.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const CHANNEL = {
  id: 'acct_1',
  provider: 'bluesky',
  accountKind: 'profile',
  handle: 'ada.bsky.social',
  displayName: 'Ada on Bluesky',
  profileUrl: 'https://bsky.app/profile/ada.bsky.social',
  status: 'needs_reauth',
  statusReason: 'auth_revoked',
  accessExpiresAt: null,
  connectedAt: '2026-10-01T08:00:00.000Z',
  lastErrorCode: null,
};

const PAGE_A = `acct_${'a'.repeat(26)}`;
const PAGE_B = `acct_${'b'.repeat(26)}`;
const PAGE_C = `acct_${'c'.repeat(26)}`;
const UNKNOWN = `acct_${'d'.repeat(26)}`;

function me(role = 'owner') {
  return { ...ME, workspaces: ME.workspaces.map((workspace) => ({ ...workspace, role })) };
}

interface Mount {
  readonly channels?: readonly unknown[];
  readonly connect?: () => Response;
  readonly role?: string;
  readonly providers?: readonly string[];
}

const PROVIDERS = ['bluesky', 'facebook', 'instagram', 'mastodon', 'threads'];

function mount(path: string, authorizationUrls: string[] = [], options: Mount = {}) {
  const bodies: unknown[] = [];
  const disconnects: string[] = [];
  const providers = (options.providers ?? PROVIDERS).map((id) => ({
    id,
    availability: 'experimental',
  }));
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url).pathname;
      if (url === '/v1/me') return Response.json(me(options.role));
      if (url === '/v1/workspaces/ws_1/channels') {
        return Response.json({ items: options.channels ?? [CHANNEL] });
      }
      if (request.method === 'POST' && url.endsWith('/disconnect')) {
        disconnects.push(url);
        return new Response(null, { status: 204 });
      }
      if (url === '/v1/workspaces/ws_1/channels/providers') {
        return Response.json({ items: providers });
      }
      if (url === '/v1/workspaces/ws_1/channels/connect') {
        bodies.push(await request.json());
        if (options.connect !== undefined) return options.connect();
        return Response.json({ authorizationUrl: authorizationUrls.shift() });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { router, bodies, disconnects };
}

describe('channels page', () => {
  it('lists channels and starts a Bluesky connect only towards an https URL', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const { bodies } = mount('/channels', [
      'https://bsky.social/oauth/authorize?request_uri=x',
      'http://bsky.social/oauth/authorize',
    ]);

    await screen.findByText('Ada on Bluesky');
    expect(screen.getByText('Needs reconnecting')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Open profile' }).getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add channel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect a channel' });
    const linkedin = within(dialog).getByRole('button', { name: 'Connect LinkedIn' });
    expect(linkedin.hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Connect Bluesky' }));
    fireEvent.change(await screen.findByLabelText('Your handle (optional)'), {
      target: { value: ' ada.bsky.social ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect Bluesky' }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://bsky.social/oauth/authorize?request_uri=x'),
    );
    expect(bodies).toEqual([{ provider: 'bluesky', loginHint: 'ada.bsky.social' }]);

    fireEvent.click(screen.getByRole('button', { name: 'All networks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Connect Instagram' }));
    await screen.findByText(
      'The network returned an unsafe sign-in address, so connecting stopped.',
    );
    expect(bodies.at(-1)).toEqual({ provider: 'instagram' });
    expect(assign).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps keyboard control of the dialog when no network is set up', async () => {
    mount('/channels', [], { providers: [] });
    fireEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect a channel' });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('connects Threads with no handle field', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const { bodies } = mount('/channels', ['https://threads.com/oauth/authorize?state=x']);
    fireEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Connect Threads' }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://threads.com/oauth/authorize?state=x'),
    );
    expect(bodies).toEqual([{ provider: 'threads' }]);
  });

  it('connects Facebook and names every connected Page', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const { bodies } = mount('/channels', ['https://www.facebook.com/v26.0/dialog/oauth?state=x']);
    fireEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Connect Facebook' }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://www.facebook.com/v26.0/dialog/oauth?state=x'),
    );
    expect(bodies).toEqual([{ provider: 'facebook' }]);
    cleanup();

    const pages = [PAGE_A, PAGE_B, PAGE_C].map((id, n) => ({
      ...CHANNEL,
      id,
      provider: 'facebook',
      accountKind: 'page',
      displayName: `Page ${n + 1}`,
      status: 'active',
    }));
    const { router } = mount(`/channels?connected=${PAGE_A},${PAGE_B},${PAGE_C}`, [], {
      channels: pages,
    });
    await screen.findByText('Connected: Page 1, Page 2, and Page 3.');
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    cleanup();

    mount(`/channels?connected=${PAGE_A},${UNKNOWN}`, [], { channels: pages });
    await screen.findByText('The channel is connected.');
  });

  it('explains a connect that shared no account', async () => {
    mount('/channels?error=no_accounts');
    await screen.findByText(
      'No account was shared. Connect again and select at least one Page you can post to.',
    );
  });

  it('hides disconnected channels and lets an owner disconnect, but not a viewer', async () => {
    const gone = { ...CHANNEL, id: 'acct_2', displayName: 'Old channel', status: 'disconnected' };
    const { disconnects } = mount('/channels', [], { channels: [CHANNEL, gone] });
    await screen.findByText('Ada on Bluesky');
    expect(screen.queryByText('Old channel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    screen.getByText(
      "Disconnect Ada on Bluesky? Scheduled posts to it won't be published. You can connect it again later.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect channel' }));
    await screen.findByText('Ada on Bluesky disconnected.');
    expect(disconnects).toEqual(['/v1/workspaces/ws_1/channels/acct_1/disconnect']);
    cleanup();

    mount('/channels', [], { role: 'viewer' });
    await screen.findByText('Ada on Bluesky');
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
  });

  it('shows a localised toast for ?error= and clears the param', async () => {
    const { router } = mount('/channels?error=state_invalid');
    await screen.findByText('The connection link expired or was already used. Start again.');
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(router.state.location.pathname).toBe('/channels');
  });
});

function instanceIssue(code: string): Response {
  return Response.json(
    { error: { code: 'unprocessable', message: '', details: [{ path: 'body.instance', code }] } },
    { status: 422 },
  );
}

function failure(status: number): Response {
  return Response.json({ error: { code: 'failed', message: '' } }, { status });
}

async function openMastodon() {
  fireEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Connect Mastodon' }));
}

async function connectMastodon(server: string) {
  fireEvent.change(await screen.findByLabelText('Your Mastodon server'), {
    target: { value: server },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Connect Mastodon' }));
}

describe('mastodon connect', () => {
  it('asks for the server and posts it with the provider', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const { bodies } = mount('/channels', ['https://mastodon.social/oauth/authorize?x=1']);
    await openMastodon();
    const field = (await screen.findByLabelText('Your Mastodon server')) as HTMLInputElement;
    expect(field.required).toBe(true);
    expect(field.inputMode).toBe('url');
    expect(field.placeholder).toBe('mastodon.social');
    await connectMastodon(' mastodon.social ');
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://mastodon.social/oauth/authorize?x=1'),
    );
    expect(bodies).toEqual([{ provider: 'mastodon', instance: 'mastodon.social' }]);
  });

  it.each([
    ['required', () => instanceIssue('required'), 'Enter a server name like mastodon.social.'],
    ['invalid', () => instanceIssue('invalid'), 'Enter a server name like mastodon.social.'],
    [
      'provider_rejected',
      () => instanceIssue('provider_rejected'),
      "That server didn't accept Kronaut. Check the name or try another server.",
    ],
    ['429', () => failure(429), 'Too many servers were set up recently. Try again in an hour.'],
    ['503', () => failure(503), "That server couldn't be reached. Try again later."],
  ])('shows %s under the server field', async (_name, connect, message) => {
    mount('/channels', [], { connect });
    await openMastodon();
    await connectMastodon('mastodon.example');
    const note = await screen.findByText(message);
    const field = screen.getByLabelText('Your Mastodon server');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe(note.id);
  });

  it('keeps the generic connect error for anything else', async () => {
    mount('/channels', [], { connect: () => failure(500) });
    await openMastodon();
    await connectMastodon('mastodon.example');
    await screen.findByText("Connecting the channel didn't work. Try again.");
    expect(screen.getByLabelText('Your Mastodon server').getAttribute('aria-invalid')).toBe(
      'false',
    );
  });

  it('reconnects with the server from the handle, or opens the server form', async () => {
    vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const mastodon = (id: string, handle: string) => ({
      ...CHANNEL,
      id,
      provider: 'mastodon',
      handle,
      displayName: `Ada ${id}`,
      profileUrl: null,
    });
    const { bodies } = mount('/channels', ['https://social.example.org/oauth/authorize'], {
      channels: [mastodon('acct_1', '@ada@social.example.org'), mastodon('acct_2', 'ada')],
    });
    const [parsed, unparsed] = await screen.findAllByRole('button', { name: 'Reconnect' });
    fireEvent.click(parsed as HTMLElement);
    await waitFor(() =>
      expect(bodies).toEqual([{ provider: 'mastodon', instance: 'social.example.org' }]),
    );
    fireEvent.click(unparsed as HTMLElement);
    expect(document.activeElement).toBe(screen.getByLabelText('Your Mastodon server'));
    expect(bodies).toHaveLength(1);
  });

  it('offers a reconnect for insights only on a Meta channel without them', async () => {
    vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const active = (id: string, provider: string, insights: boolean) => ({
      ...CHANNEL,
      id,
      provider,
      status: 'active',
      statusReason: null,
      displayName: `Ada ${id}`,
      insights,
    });
    const { bodies } = mount('/channels', ['https://www.facebook.com/dialog'], {
      channels: [
        active('acct_1', 'facebook', false),
        active('acct_2', 'instagram', true),
        active('acct_3', 'bluesky', false),
      ],
    });
    const hints = await screen.findAllByRole('button', { name: 'Reconnect to add insights' });
    expect(hints).toHaveLength(1);
    fireEvent.click(hints[0] as HTMLElement);
    await waitFor(() => expect(bodies).toEqual([{ provider: 'facebook' }]));
  });

  it('toasts a failed reconnect instead of marking the connect field', async () => {
    const { bodies } = mount('/channels', [], {
      connect: () => failure(503),
      channels: [
        {
          ...CHANNEL,
          provider: 'mastodon',
          handle: '@ada@social.example.org',
          displayName: 'Ada',
          profileUrl: null,
        },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Reconnect' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(
      await screen.findByText("That server couldn't be reached. Try again later."),
    ).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
