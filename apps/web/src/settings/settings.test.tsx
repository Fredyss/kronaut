// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';

afterEach(cleanup);

const PATH = '/v1/workspaces/ws_1/approval-policy';

const VALUES = {
  mode: 'required',
  requiredApprovals: 1,
  allowSelfApproval: false,
  rescheduleToleranceMin: 0,
};

function stored(version: number, requiredApprovals = 1) {
  return {
    brandId: null,
    ...VALUES,
    requiredApprovals,
    version,
    updatedAt: '2026-10-24T07:00:00.000Z',
  };
}

interface Call {
  readonly method: string;
  readonly body: unknown;
  readonly key: string | null;
}

function mount(role: string, put: (count: number) => Response) {
  const calls: Call[] = [];
  let version = 3;
  let reads = 0;
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const raw = input as Request;
      const path = new URL(raw.url).pathname;
      if (path === '/v1/me') {
        return Response.json({
          user: { id: 'usr_1', displayName: 'Ada', email: null, locale: 'en' },
          workspaces: [{ id: 'ws_1', name: 'Studio', role, canApprove: true }],
        });
      }
      if (path !== PATH) {
        return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
      }
      if (raw.method === 'GET') {
        reads += 1;
        return Response.json({ workspace: stored(version), brands: [], effective: VALUES });
      }
      calls.push({
        method: raw.method,
        body: await raw.json(),
        key: raw.headers.get('Idempotency-Key'),
      });
      const response = put(calls.length);
      if (response.status === 409) version = 4;
      return response;
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/settings/approvals'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return Object.assign(calls, { reads: () => reads });
}

describe('approval settings', () => {
  it('lets an owner save the policy against the version they read', async () => {
    const calls = mount('owner', () => Response.json(stored(4, 2)));
    const count = await screen.findByLabelText('Approvals needed');
    fireEvent.change(count, { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Requesters can approve their own posts'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Approval settings saved.')).toBeDefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('PUT');
    expect(calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls[0]?.body).toEqual({
      ...VALUES,
      requiredApprovals: 2,
      allowSelfApproval: true,
      expectedVersion: 3,
    });
  });

  it('shows the policy read-only to an editor', async () => {
    const calls = mount('editor', () => Response.json(stored(4)));
    expect(
      await screen.findByText('Only owners and admins can change these settings.'),
    ).toBeDefined();
    expect((screen.getByLabelText('Approvals needed') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Posts need approval') as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('reloads and says so when someone else saved first', async () => {
    const calls = mount('admin', () =>
      Response.json({ error: { code: 'version_conflict', message: '' } }, { status: 409 }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Someone else changed these settings. The latest version is shown.'),
    ).toBeDefined();
    await waitFor(() => expect(calls.reads()).toBe(2));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.body).toMatchObject({ expectedVersion: 4 });
  });
});
