// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { GroupSettingsPage } from './groups-page.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const LAUNCH = { id: 'grp_a', name: 'Launch', channelIds: [] };

function mount() {
  const created: unknown[] = [];
  const groups: (typeof LAUNCH)[] = [];
  const fetch = async (raw: Request | URL | string) => {
    const request = raw as Request;
    if (new URL(request.url).pathname === '/v1/me') return Response.json(ME);
    if (request.method === 'GET') return Response.json({ items: groups });
    created.push(await request.json());
    if (groups.length > 0) {
      return Response.json({ error: { code: 'group_name_taken', message: '' } }, { status: 409 });
    }
    groups.push(LAUNCH);
    return Response.json(LAUNCH, { status: 201 });
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <GroupSettingsPage />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return created;
}

async function addGroup(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'New group' }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'Group name' }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
}

describe('group settings', () => {
  it('creates a group in a dialog, then says when the name is taken', async () => {
    const created = mount();
    await addGroup(' Launch ');
    expect(await screen.findByRole('textbox', { name: 'Name of group Launch' })).toBeDefined();
    expect(screen.getByText('0 channels')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Group name' })).toBeNull());

    await addGroup('launch');
    expect(await screen.findByText('A group with this name already exists.')).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Group name' })).toBeDefined();
    expect(created).toEqual([{ name: 'Launch' }, { name: 'launch' }]);
  });
});
