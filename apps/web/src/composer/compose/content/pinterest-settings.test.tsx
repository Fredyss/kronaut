// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, channel, jpeg, mount, pickFiles, warmComposer } from '../testing.tsx';

vi.mock('./editor.tsx', async () => ({
  default: (await import('../testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const POSTS = '/v1/workspaces/ws_1/posts';
const PINTEREST = channel('acct_pin', 'pinterest', 'Ada on Pinterest');

function server(channels: readonly unknown[]) {
  return (call: Call): Response | undefined =>
    call.path === '/v1/workspaces/ws_1/channels' ? Response.json({ items: channels }) : undefined;
}

async function pinterestTab(channels: readonly unknown[] = [PINTEREST]) {
  const mounted = mount(server(channels));
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Oak table' } });
  pickFiles([jpeg('table.jpg')]);
  fireEvent.click(await screen.findByRole('checkbox', { name: /Ada on Pinterest/ }));
  fireEvent.click(await screen.findByRole('tab', { name: /Ada on Pinterest/ }));
  return mounted;
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

warmComposer();

describe('Pinterest settings', () => {
  it('offers the stored boards and refuses to publish without one', async () => {
    const { mutations } = await pinterestTab();
    expect(screen.getByRole('group', { name: 'Pinterest' })).toBeDefined();
    const board = screen.getByLabelText('Board') as HTMLSelectElement;
    const options = Array.from(board.options, (option) => option.textContent);
    expect(options).toEqual(['Choose a board', 'Garden', 'Recipes']);
    expect(screen.getByText('0 / 100')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Choose a Pinterest board for Ada on Pinterest.',
    );
    expect(mutations().some((call) => call.path.startsWith(POSTS))).toBe(false);
  });

  it('flags a link that is not https', async () => {
    await pinterestTab();
    fireEvent.change(field('Link'), { target: { value: 'http://shop.example.org' } });
    expect(screen.getByText('Use a full link that starts with https://.')).toBeDefined();
    expect(field('Link').getAttribute('aria-invalid')).toBe('true');
  });

  it('saves the board, title and link with the draft', async () => {
    const { router, mutations } = await pinterestTab();
    fireEvent.change(field('Board'), { target: { value: '9002' } });
    fireEvent.change(field('Title'), { target: { value: 'Oak table' } });
    fireEvent.change(field('Link'), { target: { value: 'https://shop.example.org/oak' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Keep as draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const create = mutations().find((call) => call.path === POSTS);
    expect(create?.body).toHaveProperty(['destinations', 0], {
      accountId: 'acct_pin',
      publishType: 'pin',
      settings: { boardId: '9002', title: 'Oak table', link: 'https://shop.example.org/oak' },
    });
  });

  it('explains how to get boards when the account has none', async () => {
    await pinterestTab([{ ...PINTEREST, settingOptions: {} }]);
    expect(
      screen.getByText(
        'This account has no public boards. Create one on Pinterest, then connect the channel again.',
      ),
    ).toBeDefined();
    expect(screen.queryByLabelText('Board')).toBeNull();
  });
});
