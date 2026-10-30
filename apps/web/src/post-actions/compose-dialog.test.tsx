// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COLD, channel, mount, type Override, post, warmUp } from '../compose/testing.tsx';

vi.mock('../compose/editor.tsx', async () => ({
  default: (await import('../compose/testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const POST_ID = 'post_01jbcdefghjkmnpqrstvwxyz01';
const COPY_ID = 'post_01jbcdefghjkmnpqrstvwxyz02';
const POSTS = '/v1/workspaces/ws_1/posts';

function stored(id: string, state: string) {
  const base = post('draft', state);
  const doc = { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] };
  return {
    ...base,
    id,
    version: 4,
    seriesId: null,
    publishSummary: state === 'draft' ? 'draft' : 'completed',
    items: [{ position: 0, role: 'main', doc: { type: 'doc', content: [doc] }, media: [] }],
    variants: [],
    destinations: base.destinations.slice(0, 1).map((destination) => ({
      ...destination,
      publishType: 'post',
      variant: null,
    })),
  };
}

function start(url: string, posts: readonly ReturnType<typeof stored>[], override?: Override) {
  const mounted = mount((call, count) => {
    const replaced = override?.(call, count);
    if (replaced !== undefined) return replaced;
    const found = posts.find(({ id }) => call.path === `${POSTS}/${id}`);
    if (found !== undefined) return Response.json(found);
    if (call.path.endsWith('/channels')) {
      return Response.json({ items: [channel('acct_bsky', 'bluesky', 'Ada on Bluesky')] });
    }
    if (call.path === POSTS) return Response.json({ items: [], truncated: false });
    return undefined;
  }, url);
  // A memory history doesn't follow window.history.
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
    mounted.router.history.back();
  });
  return { ...mounted, back };
}

const close = async () => fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

async function saveEdit() {
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Changed' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
}

warmUp(
  async () => {
    start('/?compose=new', []);
    await screen.findByRole('heading', { name: 'New post' }, COLD);
    await screen.findByLabelText('Text', {}, COLD);
  },
  async () => {
    start('/?view=list', []);
    await screen.findByRole('link', { name: 'Create post' }, COLD);
  },
  async () => {
    start(`/posts/${POST_ID}`, [stored(POST_ID, 'draft')]);
    fireEvent.click(await screen.findByRole('link', { name: 'Edit' }, COLD));
    await screen.findByRole('heading', { name: 'Edit post' }, COLD);
    await screen.findByLabelText('Text', {}, COLD);
  },
);

describe('composer dialog', () => {
  it('opens from Create post on the calendar and closes back to it', async () => {
    const { router, back } = start('/?view=list', []);
    fireEvent.click(await screen.findByRole('link', { name: 'Create post' }));
    await screen.findByRole('heading', { name: 'New post' });
    expect(router.state.location.search).toMatchObject({ compose: 'new' });
    expect(router.state.location.state.composeHere).toBe(true);
    await close();
    await waitFor(() => expect(router.state.location.search).toEqual({ view: 'list' }));
    expect(router.state.location.pathname).toBe('/');
    expect(back).toHaveBeenCalledOnce();
  });

  it('closes a direct link by replacing the URL', async () => {
    const { router, back } = start('/?compose=new', []);
    await screen.findByRole('heading', { name: 'New post' });
    await close();
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(back).not.toHaveBeenCalled();
  });

  it('edits over the post page and stays there after saving', async () => {
    const { router, back } = start(`/posts/${POST_ID}`, [stored(POST_ID, 'draft')]);
    fireEvent.click(await screen.findByRole('link', { name: 'Edit' }));
    await screen.findByRole('heading', { name: 'Edit post' });
    expect(router.state.location.search).toEqual({ compose: POST_ID });
    await saveEdit();
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(router.state.location.pathname).toBe(`/posts/${POST_ID}`);
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('lands on the copy after saving one from a post page', async () => {
    const copy = stored(COPY_ID, 'draft');
    const { router, back } = start(
      `/posts/${POST_ID}`,
      [stored(POST_ID, 'published'), copy],
      (call) =>
        call.path.endsWith('/duplicate') ? Response.json(copy, { status: 201 }) : undefined,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }));
    await screen.findByRole('heading', { name: 'Edit post' });
    expect(router.state.location.pathname).toBe(`/posts/${POST_ID}`);
    expect(router.state.location.search).toEqual({ compose: COPY_ID });
    await saveEdit();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/posts/${COPY_ID}`));
    expect(router.state.location.search).toEqual({});
    expect(back).not.toHaveBeenCalled();
  });

  it('stays open when a file picker inside it is canceled', async () => {
    const { router } = start('/?compose=new', []);
    await screen.findByLabelText('Text');
    const input = document.querySelector('input[type=file]');
    if (input === null) throw new Error('no file input');
    fireEvent(input, new Event('cancel', { bubbles: true }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(router.state.location.search).toEqual({ compose: 'new' });
  });

  it('ignores Close during a save, then closes once when it finishes', async () => {
    const draft = stored(POST_ID, 'draft');
    const response = Promise.withResolvers<Response>();
    const { back, mutations } = start(`/posts/${POST_ID}`, [draft], (call) =>
      call.method === 'PATCH' ? response.promise : undefined,
    );
    fireEvent.click(await screen.findByRole('link', { name: 'Edit' }));
    await saveEdit();
    await waitFor(() => expect(mutations()).toHaveLength(1));
    await close();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(back).not.toHaveBeenCalled();
    response.resolve(Response.json(draft));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(back).toHaveBeenCalledOnce();
  });
});
