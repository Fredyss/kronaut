// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from '../app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const BASE = '/v1/workspaces/ws_1/posts/post_1/destinations/';

function item(id: string, state: string, reason: string | null, extra: object = {}) {
  return {
    destinationId: id,
    version: 4,
    state,
    reason,
    postId: 'post_1',
    postVersion: 2,
    excerpt: `Hello ${id}`,
    accountId: 'acct_1',
    provider: 'bluesky',
    accountLabel: 'Ada',
    accountHandle: 'ada.bsky.social',
    publishType: 'post',
    deliveryMode: 'auto',
    scheduledAt: '2026-10-13T07:30:00.000Z',
    remoteUrl: null,
    updatedAt: '2026-10-13T08:00:00.000Z',
    ...extra,
  };
}

interface List {
  readonly items: unknown[];
  readonly total: number;
  readonly truncated: boolean;
}

interface Call {
  readonly action: string;
  readonly body: Record<string, unknown>;
  readonly key: string | null;
}

type Reply = (call: Call) => Response | Promise<Response | undefined> | undefined;

function listOf(items: unknown[], total = items.length): List {
  return { items, total, truncated: total > items.length };
}

function mount(list: List, reply: Reply = () => undefined, path = '/inbox') {
  const calls: Call[] = [];
  const lists = { count: 0 };
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url).pathname;
      if (url === '/v1/me') return Response.json(ME);
      if (url === '/v1/workspaces/ws_1/needs-action') {
        lists.count += 1;
        return Response.json(list);
      }
      if (url.startsWith(BASE) && request.method === 'POST') {
        const call = {
          action: url.slice(BASE.length),
          body: (await request.json()) as Record<string, unknown>,
          key: request.headers.get('Idempotency-Key'),
        };
        calls.push(call);
        return (await reply(call)) ?? Response.json({ id: 'post_1', version: 3, destinations: [] });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { calls, lists };
}

async function row(name: string): Promise<HTMLElement> {
  const link = await screen.findByRole('link', { name });
  const li = link.closest('li');
  if (li === null) throw new Error(`no row for ${name}`);
  return li;
}

function buttons(li: HTMLElement): string[] {
  return within(li)
    .getAllByRole('button')
    .map((button) => button.textContent ?? '');
}

function error(status: number, code: string, details?: object[]) {
  return Response.json({ error: { code, message: '', details } }, { status });
}

describe('needs-action inbox', () => {
  it('lists each row with the actions its state allows', async () => {
    mount(
      listOf([
        item('dst_u', 'unconfirmed', 'ambiguous_response', {
          remoteUrl: 'https://bsky.app/profile/ada/post/1',
        }),
        item('dst_m', 'awaiting_manual', null),
        item('dst_f', 'failed', 'attempts_exhausted'),
        item('dst_b', 'blocked', 'account_needs_reauth'),
        item('dst_p', 'blocked', 'policy_denied'),
      ]),
    );
    const unconfirmed = await row('Hello dst_u');
    expect(buttons(unconfirmed)).toEqual(['Mark as published', 'Send again']);
    expect(within(unconfirmed).getByText('Not confirmed')).toBeDefined();
    expect(within(unconfirmed).getByText(/answer was unclear/)).toBeDefined();
    const view = within(unconfirmed).getByRole('link', { name: 'View post' });
    expect(view.getAttribute('rel')).toBe('noopener noreferrer');
    expect(view.getAttribute('target')).toBe('_blank');
    expect(
      within(await row('Hello dst_u')).getByRole('link', { name: 'Hello dst_u' }),
    ).toBeDefined();
    expect(buttons(await row('Hello dst_m'))).toEqual(['Mark as done', 'Cancel']);
    expect(buttons(await row('Hello dst_f'))).toEqual(['Send again', 'Cancel']);
    const blocked = await row('Hello dst_b');
    expect(buttons(blocked)).toEqual(['Send again', 'Cancel']);
    expect(
      within(blocked).getByRole('link', { name: 'Reconnect channel' }).getAttribute('href'),
    ).toBe('/channels');
    expect(within(await row('Hello dst_p')).queryByRole('link', { name: /Reconnect/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Hello dst_f' }).getAttribute('href')).toBe(
      '/posts/post_1',
    );
  });

  it('shows the empty state and the truncated note', async () => {
    mount(listOf([]));
    expect(await screen.findByText('Nothing needs your attention')).toBeDefined();
    cleanup();
    mount(listOf([item('dst_f', 'failed', 'permanent_error')], 250));
    expect(await screen.findByText('Showing only the newest 1 of 250 items.')).toBeDefined();
  });

  it.each([
    [3, '3', '3 items need action'],
    [150, '99+', '150 items need action'],
  ])('badges the nav link with a total of %i', async (total, shown, name) => {
    mount(listOf([item('dst_f', 'failed', null)], total), undefined, '/channels');
    const nav = await screen.findByRole('navigation');
    const link = await within(nav).findByRole('link', { name: new RegExp(name) });
    expect(link.querySelector('span[aria-hidden="true"]')?.textContent).toBe(shown);
  });

  it('hides the badge when nothing needs action', async () => {
    const { lists } = mount(listOf([]), undefined, '/channels');
    await waitFor(() => expect(lists.count).toBe(1));
    const nav = await screen.findByRole('navigation');
    const link = within(nav).getByRole('link', { name: 'Needs action' });
    expect(link.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('asks before sending an unconfirmed row again', async () => {
    const { calls } = mount(listOf([item('dst_u', 'unconfirmed', 'verify_inconclusive')]));
    const li = await row('Hello dst_u');
    const send = within(li).getByRole('button', { name: 'Send again' });
    fireEvent.click(send);
    const box = within(li).getByRole('checkbox', { name: 'This may post twice' });
    expect(document.activeElement).toBe(box);
    const confirm = within(li).getByRole('button', { name: 'Send again anyway' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(confirm);
    expect(calls).toHaveLength(0);
    fireEvent.click(box);
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      action: 'dst_u/send-again',
      body: { expectedVersion: 4, mode: 'asap', acknowledgeDuplicate: true },
    });
    expect(calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText('It will be sent again shortly.')).toBeDefined();
  });

  it('returns focus to Send again when the confirmation closes', async () => {
    mount(listOf([item('dst_u', 'unconfirmed', null)]));
    const li = await row('Hello dst_u');
    const send = within(li).getByRole('button', { name: 'Send again' });
    fireEvent.click(send);
    fireEvent.click(within(li).getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(document.activeElement).toBe(send));
    expect(within(li).queryByRole('checkbox')).toBeNull();
  });

  it('opens the confirmation when a failed row answers duplicate_risk', async () => {
    const { calls } = mount(listOf([item('dst_f', 'failed', 'permanent_error')]), (call) =>
      call.body.acknowledgeDuplicate === true
        ? undefined
        : error(422, 'unprocessable', [
            { path: 'body.acknowledgeDuplicate', code: 'duplicate_risk' },
          ]),
    );
    const li = await row('Hello dst_f');
    fireEvent.click(within(li).getByRole('button', { name: 'Send again' }));
    const box = await within(li).findByRole('checkbox', { name: 'This may post twice' });
    expect(calls[0]?.body).toEqual({ expectedVersion: 4, mode: 'asap' });
    fireEvent.click(box);
    fireEvent.click(within(li).getByRole('button', { name: 'Send again anyway' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.body).toEqual({
      expectedVersion: 4,
      mode: 'asap',
      acknowledgeDuplicate: true,
    });
  });

  it('marks a row published with its version and refetches the list', async () => {
    let release = () => {};
    const held = new Promise<undefined>((resolve) => {
      release = () => resolve(undefined);
    });
    const { calls, lists } = mount(listOf([item('dst_m', 'awaiting_manual', null)]), () => held);
    const li = await row('Hello dst_m');
    expect(lists.count).toBe(1);
    const mark = within(li).getByRole('button', { name: 'Mark as done' });
    fireEvent.click(mark);
    await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(true));
    expect((within(li).getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    release();
    expect(await screen.findByText('Marked as published.')).toBeDefined();
    expect(calls).toEqual([
      { action: 'dst_m/mark-published', body: { expectedVersion: 4 }, key: expect.any(String) },
    ]);
    await waitFor(() => expect(lists.count).toBe(2));
  });

  it('says the row changed and refetches when a cancel conflicts', async () => {
    const { calls, lists } = mount(listOf([item('dst_f', 'failed', null)]), () =>
      error(409, 'version_conflict'),
    );
    const li = await row('Hello dst_f');
    fireEvent.click(within(li).getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText(/This item changed in the meantime/)).toBeDefined();
    expect(calls[0]).toMatchObject({ action: 'dst_f/cancel', body: { expectedVersion: 4 } });
    await waitFor(() => expect(lists.count).toBe(2));
  });
});
