// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, channel, mount } from './compose-testing.tsx';

vi.mock('./compose/editor.tsx', async () => ({
  default: (await import('./compose-testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const POSTS = '/v1/workspaces/ws_1/posts';

const CHAIN_POST = {
  id: 'post',
  text: [{ counting: 'threads', max: 500 }],
  maxLinks: 5,
  imageAspect: null,
  video: null,
  thread: { maxItems: 10 },
  comment: { text: [{ counting: 'graphemes', max: 2200 }] },
};

const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  { ...channel('acct_th', 'threads', 'Ada on Threads'), postTypes: [CHAIN_POST] },
];

function server(call: Call): Response | undefined {
  if (call.path === '/v1/workspaces/ws_1/channels') return Response.json({ items: CHANNELS });
  return undefined;
}

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

async function start(...channels: string[]) {
  const mounted = mount(server);
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Main' } });
  for (const name of channels) {
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(name) }));
  }
  return mounted;
}

const button = (name: string) => screen.getByRole('button', { name });
const type = async (label: string, value: string) =>
  fireEvent.change(await screen.findByLabelText(label), { target: { value } });
const creates = (calls: readonly Call[]) => calls.filter((c) => c.path === POSTS);

describe('composer reply chains', () => {
  it('publishes the main post, two replies and a first comment in order', async () => {
    const { router, mutations } = await start('Ada on Threads');
    fireEvent.click(button('Add reply'));
    fireEvent.click(button('Add reply'));
    fireEvent.click(button('Add first comment'));
    expect(screen.queryByRole('button', { name: 'Add first comment' })).toBeNull();
    await type('Reply 1', 'First');
    await type('Reply 2', 'Second');
    await type('First comment', 'Link');
    fireEvent.click(button('Publish now'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(creates(mutations())[0]?.body).toEqual({
      items: [
        { role: 'main', doc: doc('Main'), media: [] },
        { role: 'thread', doc: doc('First'), media: [] },
        { role: 'thread', doc: doc('Second'), media: [] },
        { role: 'comment', doc: doc('Link'), media: [] },
      ],
      destinations: [{ accountId: 'acct_th', publishType: 'post' }],
    });
  });

  it('offers no reply or comment when no selected channel supports them', async () => {
    await start('Ada on Bluesky');
    expect(screen.queryByRole('button', { name: 'Add reply' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add first comment' })).toBeNull();
  });

  it('notes a channel that publishes the main post only without blocking Publish', async () => {
    const { router, mutations } = await start('Ada on Bluesky', 'Ada on Threads');
    fireEvent.click(button('Add reply'));
    await type('Reply 1', 'First');
    expect(screen.getByText('Ada on Bluesky will publish the main post only.')).toBeDefined();
    expect(screen.queryByText('Ada on Threads will publish the main post only.')).toBeNull();
    fireEvent.click(button('Publish now'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(creates(mutations())[0]?.body).toMatchObject({
      items: [{ role: 'main' }, { role: 'thread', doc: doc('First') }],
      destinations: [{ accountId: 'acct_bsky' }, { accountId: 'acct_th' }],
    });
  });

  it('blocks Publish while a reply is blank', async () => {
    const { mutations } = await start('Ada on Threads');
    fireEvent.click(button('Add reply'));
    await screen.findByLabelText('Reply 1');
    fireEvent.click(button('Publish now'));

    expect((await screen.findByRole('alert')).textContent).toBe('Reply 1 is empty.');
    expect(creates(mutations())).toEqual([]);
  });

  it('flags a reply over the channel text limit', async () => {
    await start('Ada on Threads');
    fireEvent.click(button('Add reply'));
    await type('Reply 1', 'a'.repeat(501));

    expect(await screen.findByText('Reply 1 is too long for Threads (501/500)')).toBeDefined();
    await waitFor(() => expect((button('Publish now') as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(button('Remove reply 1'));
    await waitFor(() => expect((button('Publish now') as HTMLButtonElement).disabled).toBe(false));
  });
});
