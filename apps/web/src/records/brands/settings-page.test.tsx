// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { BrandSettingsPage } from './settings-page.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const ACME = { id: 'brand_a', name: 'Acme', slug: 'acme', archivedAt: null, channelCount: 0 };

function mount() {
  const created: unknown[] = [];
  const brands: (typeof ACME)[] = [];
  const fetch = async (raw: Request | URL | string) => {
    const request = raw as Request;
    if (new URL(request.url).pathname === '/v1/me') return Response.json(ME);
    if (request.method === 'GET') return Response.json({ items: brands });
    const body = await request.json();
    created.push(body);
    if (brands.length > 0) {
      return Response.json({ error: { code: 'brand_name_taken', message: '' } }, { status: 409 });
    }
    brands.push(ACME);
    return Response.json(ACME, { status: 201 });
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <BrandSettingsPage />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return created;
}

describe('brand settings', () => {
  it('creates a brand, then says when the name is taken', async () => {
    const created = mount();
    const input = await screen.findByRole('textbox', { name: 'New brand name' });
    fireEvent.change(input, { target: { value: ' Acme ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add brand' }));
    expect(await screen.findByRole('textbox', { name: 'Name of brand Acme' })).toBeDefined();
    expect(screen.getByText('0 channels')).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('');

    fireEvent.change(input, { target: { value: 'acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add brand' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'A brand with this name already exists.',
    );
    expect(created).toEqual([{ name: 'Acme' }, { name: 'acme' }]);
  });
});
