// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from './app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

function mount(path: string) {
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const url = new URL((input as Request).url).pathname;
      if (url === '/v1/me') return Response.json(ME);
      if (url === '/v1/workspaces/ws_1/needs-action') {
        return Response.json({ items: [], total: 3, truncated: true });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
}

const ITEMS = ['Calendar', 'Needs action', 'Channels', 'Settings'];

describe('icon rail', () => {
  it.each([
    ['/channels', 'Channels'],
    ['/settings/account', 'Settings'],
  ])('marks the active item on %s', async (path, active) => {
    mount(path);
    const rail = await screen.findByRole('navigation', { name: 'Main' });
    const links = await within(rail).findAllByRole('link');
    const label = (link: HTMLElement) => link.lastElementChild?.textContent;
    expect(links.map(label)).toEqual(ITEMS);
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map(label)).toEqual([active]);
  });

  it('keeps the needs-action badge on the inbox item', async () => {
    mount('/channels');
    const rail = await screen.findByRole('navigation', { name: 'Main' });
    const inbox = await within(rail).findByRole('link', { name: /3 items need action/ });
    expect(inbox.getAttribute('href')).toBe('/inbox');
    expect(inbox.querySelector('span[aria-hidden="true"]')?.textContent).toBe('3');
  });

  it('drops the old header links', async () => {
    mount('/channels');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(screen.queryByRole('link', { name: 'New post' })).toBeNull();
    expect(document.querySelector('header')?.querySelector('a')).toBeNull();
  });
});
