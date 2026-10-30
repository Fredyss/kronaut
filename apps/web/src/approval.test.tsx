// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from './app.tsx';

afterEach(cleanup);

const BASE = '/v1/workspaces/ws_1';
const REQUESTS = `${BASE}/posts/post_1/approval-requests`;
const DECISIONS = `${BASE}/approval-requests/req_1/decisions`;

function me(canApprove: boolean) {
  return {
    user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
    workspaces: [{ id: 'ws_1', name: 'Studio', role: 'editor', canApprove }],
  };
}

const VALUES = { mode: 'required', requiredApprovals: 2, allowSelfApproval: false };
const POLICY = {
  workspace: null,
  brands: [],
  effective: { ...VALUES, rescheduleToleranceMin: 0 },
};

function post(summary: string) {
  return {
    id: 'post_1',
    version: 4,
    title: null,
    scheduleMode: 'unscheduled',
    scheduleLocal: null,
    scheduleTz: null,
    publishSummary: summary,
    tags: [],
    items: [{ position: 0, role: 'main', doc: {}, media: [] }],
    destinations: [],
    createdAt: '2026-10-24T07:00:00.000Z',
    updatedAt: '2026-10-24T07:00:00.000Z',
  };
}

type Decision = { decision: string; userId: string; createdAt: string };

function request(state: string, by: string, decisions: Decision[] = [], bound = false) {
  return {
    id: 'req_1',
    state,
    voidReason: null,
    note: 'Please check the link',
    requestedBy: { kind: 'user', id: by },
    requiredApprovals: 2,
    postVersion: 4,
    createdAt: '2026-10-24T07:30:00.000Z',
    resolvedAt: null,
    destinations: [
      {
        destinationId: 'destination_1',
        scheduleBound: bound,
        shownLocal: bound ? '2099-01-02T10:30:00' : null,
        shownTz: bound ? 'Europe/Bratislava' : null,
        toleranceMin: bound ? 15 : null,
      },
    ],
    decisions,
  };
}

const APPROVED: Decision = {
  decision: 'approve',
  userId: 'usr_9',
  createdAt: '2026-10-24T08:00:00.000Z',
};

interface Call {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

interface Scenario {
  readonly canApprove: boolean;
  readonly summary: string;
  requests(): unknown[];
  respond?(call: Call): Response | undefined;
}

async function bodyOf(raw: Request): Promise<unknown> {
  const text = await raw.text();
  return text === '' ? null : JSON.parse(text);
}

function mount(scenario: Scenario) {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const raw = input as Request;
      const path = new URL(raw.url).pathname;
      const call = {
        method: raw.method,
        path,
        body: await bodyOf(raw),
      };
      calls.push(call);
      const replaced = scenario.respond?.(call);
      if (replaced !== undefined) return replaced;
      if (path === '/v1/me') return Response.json(me(scenario.canApprove));
      if (path === `${BASE}/channels`) return Response.json({ items: [] });
      if (path === `${BASE}/approval-policy`) return Response.json(POLICY);
      if (path === `${BASE}/posts/post_1`) return Response.json(post(scenario.summary));
      if (path === REQUESTS) return Response.json({ items: scenario.requests() });
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/posts/post_1'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

function forbidden(code: string): Response {
  return Response.json(
    { error: { code: 'forbidden', message: '', details: [{ path: 'authorization', code }] } },
    { status: 403 },
  );
}

describe('approval panel', () => {
  it('lets an approver approve and shows the updated count', async () => {
    let decided = false;
    const { writes } = mount({
      canApprove: true,
      summary: 'in_review',
      requests: () => [request('open', 'usr_2', decided ? [APPROVED] : [])],
      respond: (call) => {
        if (call.path !== DECISIONS) return undefined;
        decided = true;
        return Response.json(request('open', 'usr_2', [APPROVED]));
      },
    });
    expect(await screen.findByText('0 of 2 approvals')).toBeDefined();
    expect(screen.getByText('Waiting for approval')).toBeDefined();
    expect(screen.getByText('Please check the link')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('1 of 2 approvals')).toBeDefined();
    expect(writes()).toEqual([{ method: 'POST', path: DECISIONS, body: { decision: 'approve' } }]);
  });

  it('asks for the password when the session is stale and retries the decision', async () => {
    let attempts = 0;
    const { writes } = mount({
      canApprove: true,
      summary: 'in_review',
      requests: () => [request('open', 'usr_2')],
      respond: (call) => {
        if (call.path === '/v1/auth/reauthenticate') {
          return Response.json({ reauthenticatedAt: '2026-10-24T09:00:00.000Z' });
        }
        if (call.path !== DECISIONS) return undefined;
        attempts += 1;
        return attempts === 1
          ? forbidden('reauth_required')
          : Response.json(request('open', 'usr_2', [APPROVED]));
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirm your password' });
    const password = screen.getByLabelText('Password');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(document.activeElement).toBe(password);
    expect(dialog).toBeDefined();
    fireEvent.change(password, { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(attempts).toBe(2));
    expect(writes().map((c) => [c.path, c.body])).toEqual([
      [DECISIONS, { decision: 'reject' }],
      ['/v1/auth/reauthenticate', { password: 'correct horse' }],
      [DECISIONS, { decision: 'reject' }],
    ]);
  });

  it('shows the requester Withdraw and no decision buttons', async () => {
    const { writes } = mount({
      canApprove: true,
      summary: 'in_review',
      requests: () => [request('open', 'usr_1')],
      respond: (call) =>
        call.path.endsWith('/withdraw') ? Response.json(request('withdrawn', 'usr_1')) : undefined,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.getByText(/Requested by you/)).toBeDefined();
    await waitFor(() =>
      expect(writes().map((c) => c.path)).toEqual([`${BASE}/approval-requests/req_1/withdraw`]),
    );
  });

  it('schedules an approved, time-bound post at the approved time', async () => {
    const { writes } = mount({
      canApprove: false,
      summary: 'draft',
      requests: () => [request('approved', 'usr_1', [APPROVED, APPROVED], true)],
      respond: (call) =>
        call.path.endsWith('/schedule') ? Response.json(post('scheduled')) : undefined,
    });
    expect(await screen.findByText(/\(Europe\/Bratislava\) ± 15 minutes/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule as approved' }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({
      method: 'POST',
      path: `${BASE}/posts/post_1/schedule`,
      body: {
        expectedVersion: 4,
        mode: 'instant',
        scheduleLocal: '2099-01-02T10:30:00',
        scheduleTz: 'Europe/Bratislava',
      },
    });
  });

  it('asks for a new approval when the post changed after it was approved', async () => {
    mount({
      canApprove: false,
      summary: 'draft',
      requests: () => [request('approved', 'usr_1', [APPROVED, APPROVED], true)],
      respond: (call) =>
        call.path.endsWith('/schedule')
          ? Response.json({ error: { code: 'approval_required', message: '' } }, { status: 403 })
          : undefined,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule as approved' }));

    expect(
      await screen.findByText('This post changed after it was approved: request approval again.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Request approval again' }));
    expect(await screen.findByLabelText('Note for approvers (optional)')).toBeDefined();
  });
});
