// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { channel, jpeg, MEDIA_ID, mount, type Override, pickFiles } from './testing.tsx';

vi.mock('./editor.tsx', async () => ({
  default: (await import('./testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  {
    ...channel('acct_masto', 'mastodon', 'Ada on Mastodon'),
    postTypes: [{ id: 'post', text: [{ counting: 'graphemes', max: 500 }], maxLinks: null }],
  },
];

function start(override: Override = () => undefined) {
  return mount((call, count) =>
    call.path.endsWith('/channels') ? Response.json({ items: CHANNELS }) : override(call, count),
  );
}

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

async function selectBoth(text: string) {
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: text } });
  fireEvent.click(await screen.findByRole('checkbox', { name: /Ada on Bluesky/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Ada on Mastodon/ }));
}

function customize(name: string) {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }));
  expect(screen.getByText('Uses the content from All channels.')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: `Customize for ${name}` }));
}

const submitButton = () => screen.getByRole('button', { name: 'Publish now' }) as HTMLButtonElement;

function created(calls: () => { path: string; body: unknown }[]) {
  return calls().find((c) => c.path === '/v1/workspaces/ws_1/posts')?.body;
}

describe('composer variants', () => {
  it('customizes Bluesky with shorter text so a long default can go out', async () => {
    const { router, mutations } = start();
    await selectBoth('x'.repeat(301));
    await waitFor(() => expect(submitButton().disabled).toBe(true));
    expect(screen.getByRole('tab', { name: /All channels/ }).textContent).toContain('has problems');

    customize('Ada on Bluesky');
    const editor = screen.getByLabelText('Text') as HTMLTextAreaElement;
    expect(editor.value).toBe('x'.repeat(301));
    fireEvent.change(editor, { target: { value: 'Short' } });
    expect(screen.getByRole('tab', { name: /Ada on Bluesky/ }).textContent).toContain('Customized');
    await waitFor(() => expect(submitButton().disabled).toBe(false));
    fireEvent.click(submitButton());

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(created(mutations)).toEqual({
      items: [{ role: 'main', doc: doc('x'.repeat(301)), media: [] }],
      variants: [{ items: [{ role: 'main', doc: doc('Short'), media: [] }] }],
      destinations: [
        { accountId: 'acct_bsky', publishType: 'post', variant: 0 },
        { accountId: 'acct_masto', publishType: 'post' },
      ],
    });
  });

  it('blocks submit and marks the tab of a variant over its limit', async () => {
    start();
    await selectBoth('Hello');
    customize('Ada on Bluesky');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'x'.repeat(301) } });

    const issue = await screen.findByText('Too long for Bluesky (301/300)');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-describedby')).toBe(
      issue.closest('[role=status]')?.id,
    );
    const tab = screen.getByRole('tab', { name: /Ada on Bluesky/ });
    expect(tab.textContent).toContain('has problems');
    expect(screen.getByRole('tab', { name: /All channels/ }).textContent).not.toContain(
      'has problems',
    );
    fireEvent.click(screen.getByRole('tab', { name: /All channels/ }));
    expect(screen.queryByText('Too long for Bluesky (301/300)')).toBeNull();
    expect(screen.getByText('Check the content for Ada on Bluesky.')).toBeDefined();
    expect(screen.getByText('Mastodon 5/500')).toBeDefined();
  });

  it('drops the variant from the payload after a reset', async () => {
    const { router, mutations } = start();
    await selectBoth('Hello');
    customize('Ada on Bluesky');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use the content from All channels' }));
    expect(screen.getByRole('tab', { name: /Ada on Bluesky/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText('Uses the content from All channels.')).toBeDefined();
    fireEvent.click(submitButton());

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(created(mutations)).toEqual({
      items: [{ role: 'main', doc: doc('Hello'), media: [] }],
      destinations: [
        { accountId: 'acct_bsky', publishType: 'post' },
        { accountId: 'acct_masto', publishType: 'post' },
      ],
    });
  });

  it('uploads an image shared by the default and a variant once, with alt text per content', async () => {
    const { router, mutations } = start();
    await selectBoth('Hello');
    pickFiles([jpeg('cat.jpg')]);
    fireEvent.change(await screen.findByLabelText('Alt text for image 1'), {
      target: { value: 'A cat' },
    });
    customize('Ada on Mastodon');
    const alt = (await screen.findByLabelText('Alt text for image 1')) as HTMLTextAreaElement;
    expect(alt.value).toBe('A cat');
    fireEvent.change(alt, { target: { value: ' A Mastodon cat ' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().filter((c) => c.path.endsWith('/media'))).toHaveLength(1);
    expect(created(mutations)).toEqual({
      items: [
        { role: 'main', doc: doc('Hello'), media: [{ mediaId: MEDIA_ID, altText: 'A cat' }] },
      ],
      variants: [
        {
          items: [
            {
              role: 'main',
              doc: doc('Hello'),
              media: [{ mediaId: MEDIA_ID, altText: 'A Mastodon cat' }],
            },
          ],
        },
      ],
      destinations: [
        { accountId: 'acct_bsky', publishType: 'post' },
        { accountId: 'acct_masto', publishType: 'post', variant: 0 },
      ],
    });
  });

  it('keeps the tab of a customized channel over its image limit and blocks until deselected', async () => {
    start();
    await selectBoth('Hello');
    customize('Ada on Mastodon');
    pickFiles([1, 2, 3, 4, 5].map((n) => jpeg(`cat-${n}.jpg`)));
    await screen.findByLabelText('Alt text for image 5');

    const tab = screen.getByRole('tab', { name: /Ada on Mastodon/ });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.textContent).toContain('has problems');
    expect(screen.getAllByText('This network accepts at most 4 images.')).toHaveLength(2);
    await waitFor(() => expect(submitButton().disabled).toBe(true));
    const mastodon = screen.getByRole('checkbox', { name: /Ada on Mastodon/ }) as HTMLInputElement;
    expect([mastodon.disabled, mastodon.checked]).toEqual([false, true]);
    const bluesky = screen.getByRole('checkbox', { name: /Ada on Bluesky/ }) as HTMLInputElement;
    expect(bluesky.disabled).toBe(false);

    fireEvent.click(mastodon);
    expect(screen.queryByRole('tab', { name: /Ada on Mastodon/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /All channels/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
    await waitFor(() => expect(submitButton().disabled).toBe(false));
    expect(mastodon.disabled).toBe(true);
  });

  it('points at flagged tabs other than the active one', async () => {
    start();
    await selectBoth('x'.repeat(301));
    customize('Ada on Mastodon');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Toot' } });

    const note = await screen.findByText('Check the content for All channels and Ada on Bluesky.');
    await waitFor(() => expect(submitButton().disabled).toBe(true));
    expect(submitButton().getAttribute('aria-describedby')).toBe(note.closest('[role=status]')?.id);
    expect(screen.queryByText('Too long for Bluesky (301/300)')).toBeNull();
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    start();
    await selectBoth('Hello');
    const [all, bluesky, mastodon] = screen.getAllByRole('tab');
    if (all === undefined || bluesky === undefined || mastodon === undefined) throw new Error();
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Content for each channel');
    expect([all, bluesky, mastodon].map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(all.getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id);

    const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });
    all.focus();
    press('ArrowRight');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Ada on Bluesky/ }));
    expect(screen.getByRole('tab', { name: /Ada on Bluesky/ }).tabIndex).toBe(0);
    press('End');
    expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Ada on Mastodon');
    press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('All channels');
    press('ArrowLeft');
    expect(document.activeElement?.textContent).toBe('Ada on Mastodon');
    press('Home');
    expect(document.activeElement?.textContent).toBe('All channels');
  });

  it('names the channel of a variant a 422 detail points at', async () => {
    start((call) =>
      call.path === '/v1/workspaces/ws_1/posts'
        ? Response.json(
            {
              error: {
                code: 'unprocessable',
                message: '',
                details: [{ path: 'body.variants.0.items.0.doc', code: 'too_large' }],
              },
            },
            { status: 422 },
          )
        : undefined,
    );
    await selectBoth('Hello');
    customize('Ada on Mastodon');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Toot' } });
    fireEvent.click(submitButton());

    await screen.findByText('Ada on Mastodon: The post is too large.');
  });
});
