// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, channel, mount, warmComposer } from '../testing.tsx';

vi.mock('./editor.tsx', async () => ({
  default: (await import('../testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const POSTS = '/v1/workspaces/ws_1/posts';
function server(provider: string) {
  const channels = [channel('acct_dc', provider, 'Ada Lounge')];
  return (call: Call): Response | undefined => {
    if (call.path === '/v1/workspaces/ws_1/channels') return Response.json({ items: channels });
    return undefined;
  };
}

warmComposer();

describe('Discord settings', () => {
  it.each(['discord', 'discord_bot'])(
    '%s sends silently and allows @everyone only when switched on',
    async (provider) => {
      const { router, mutations } = mount(server(provider));
      fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByRole('checkbox', { name: /Ada Lounge/ }));
      fireEvent.click(await screen.findByRole('tab', { name: /Ada Lounge/ }));

      const silent = screen.getByRole('switch', { name: 'Send without notifications' });
      const everyone = screen.getByRole('switch', { name: 'Allow @everyone and @here' });
      expect(silent.getAttribute('aria-checked')).toBe('false');
      expect(everyone.getAttribute('aria-checked')).toBe('false');
      fireEvent.click(silent);

      fireEvent.click(screen.getByRole('radio', { name: 'Keep as draft' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
      const create = mutations().find((call) => call.path === POSTS);
      expect(create?.body).toHaveProperty(['destinations', 0], {
        accountId: 'acct_dc',
        publishType: 'message',
        settings: { silent: true, pingEveryone: false },
      });
    },
  );
});
