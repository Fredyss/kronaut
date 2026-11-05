// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../base/api/client.ts';
import { ApprovalSettingsPage } from './settings-page.tsx';

afterEach(cleanup);

const VALUES = {
  mode: 'none',
  requiredApprovals: 1,
  allowSelfApproval: true,
  rescheduleToleranceMin: 0,
};

const OVERRIDE = {
  ...VALUES,
  brandId: 'brand_a',
  mode: 'required',
  requiredApprovals: 2,
  version: 1,
  updatedAt: '2026-11-04T07:00:00.000Z',
};

const brand = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  archivedAt: null,
  channelCount: 1,
});

function mount() {
  const fetch = async (raw: Request | URL | string) => {
    const path = new URL((raw as Request).url).pathname;
    if (path === '/v1/me') {
      return Response.json({
        user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
        workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
      });
    }
    if (path.endsWith('/brands')) {
      return Response.json({ items: [brand('brand_a', 'Acme'), brand('brand_z', 'Zeta')] });
    }
    return Response.json({ workspace: null, brands: [OVERRIDE], effective: VALUES });
  };
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <ApprovalSettingsPage />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

describe('brand overrides', () => {
  it('names each brand and opens the form of the one with an override', async () => {
    mount();
    expect(await screen.findByText('Acme')).toBeDefined();
    expect(screen.getByText('Approval required: 2 approvals')).toBeDefined();
    expect(screen.getByText('Zeta')).toBeDefined();
    expect(screen.getByText('Follows the workspace rules')).toBeDefined();
    expect(screen.queryByText('brand_a')).toBeNull();
    const acme = screen.getByRole('switch', { name: 'Override workspace policy for Acme' });
    expect(acme.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Approval rules for Acme' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Approval rules for Zeta' })).toBeNull();
  });
});
