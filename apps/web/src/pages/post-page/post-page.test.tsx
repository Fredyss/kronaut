// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, createApp } from '../../app.tsx';
import { pollDelay } from '../../records/posts/destinations.ts';

const CLIPBOARD = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function stubClipboard(value: unknown): void {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
}

function restoreClipboard(): void {
  if (CLIPBOARD === undefined) {
    Reflect.deleteProperty(navigator, 'clipboard');
    return;
  }
  Object.defineProperty(navigator, 'clipboard', CLIPBOARD);
}

afterEach(() => {
  for (const button of screen.queryAllByRole('button', { name: 'Dismiss' })) {
    fireEvent.click(button);
  }
  cleanup();
  restoreClipboard();
});

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

function destination(id: string, state: string, remoteUrl: string | null, error: string | null) {
  return {
    id,
    accountId: `acct_${id}`,
    provider: 'bluesky',
    publishType: 'post',
    deliveryMode: 'auto',
    settings: {},
    state,
    stateReason: null,
    version: 3,
    scheduledAt: '2026-10-24T08:00:00.000Z',
    remoteUrl,
    publishedAt: state === 'published' ? '2026-10-24T08:00:05.000Z' : null,
    lastErrorCode: error,
    variant: null as number | null,
  };
}

const POST = {
  id: 'post_1',
  version: 3,
  title: null,
  scheduleMode: 'instant',
  scheduleLocal: '2026-10-24T10:00:00',
  scheduleTz: 'Europe/Bratislava',
  publishSummary: 'completed_partial',
  tags: [],
  items: [
    {
      position: 0,
      role: 'main',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '<b>Hi</b>' },
              { type: 'hardBreak' },
              { type: 'text', text: 'there' },
            ],
          },
        ],
      },
      media: [{ mediaId: 'media_1', position: 0, altText: null }],
    },
  ],
  variants: [
    {
      items: [
        {
          position: 0,
          role: 'main',
          doc: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Only for b' }] }],
          },
          media: [],
        },
      ],
    },
  ],
  destinations: [
    destination('a', 'published', 'https://bsky.app/profile/ada/post/1', null),
    { ...destination('b', 'failed', 'javascript:alert(1)', 'media_rejected'), variant: 0 },
  ],
  createdAt: '2026-10-24T07:00:00.000Z',
  updatedAt: '2026-10-24T08:00:05.000Z',
};

function openPost(post: typeof POST): void {
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const path = new URL((input as Request).url).pathname;
      if (path === '/v1/me') return Response.json(ME);
      if (path === '/v1/workspaces/ws_1/channels') return Response.json({ items: [] });
      if (path === '/v1/workspaces/ws_1/posts/post_1') return Response.json(post);
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/posts/post_1'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
}

const FIRST_URL = 'https://bsky.app/profile/ada/post/1';
const SECOND_URL = 'https://bsky.app/profile/ada/post/2';

function resolvingClipboard() {
  const writeText = vi.fn((_text: string) => Promise.resolve());
  stubClipboard({ writeText });
  return writeText;
}

async function copyButtons(post: typeof POST): Promise<HTMLElement[]> {
  openPost(post);
  await screen.findByText('Partly published');
  return screen.getAllByRole('button', { name: 'Copy link' });
}

async function toastRole(message: string): Promise<string | null | undefined> {
  const text = await screen.findByText(message);
  return text.closest('[role]')?.getAttribute('role');
}

async function expectCopyFailure(clipboard: unknown): Promise<void> {
  stubClipboard(clipboard);
  const [button] = await copyButtons(POST);
  fireEvent.click(button as HTMLElement);
  expect(await toastRole("Couldn't copy the link.")).toBe('alert');
  expect(screen.queryByText('Link copied.')).toBeNull();
}

type Catalog = Record<string, ((inputs: Record<string, never>) => string) | undefined>;

describe('post status page', () => {
  it('renders destination states and links only to https posts', async () => {
    openPost(POST);

    expect(await screen.findByText('Partly published')).toBeDefined();
    expect(screen.getByText('Published')).toBeDefined();
    expect(screen.getByText('Failed')).toBeDefined();
    expect(screen.getByText('1 image')).toBeDefined();
    expect(
      screen.getByText('<b>Hi</b>\nthere', {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeDefined();
    expect(screen.getByText('media_rejected')).toBeDefined();
    expect(screen.getAllByText('Text customized for this channel')).toHaveLength(1);
    expect(screen.getByText('Only for b')).toBeDefined();
    const links = screen.getAllByRole('link', { name: 'View post' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://bsky.app/profile/ada/post/1',
    ]);
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(document.querySelector('b')).toBeNull();
  });

  it('waits until a scheduled post is nearly due before polling', () => {
    const now = Date.parse('2026-10-24T07:00:00.000Z');
    const scheduled = {
      ...POST,
      publishSummary: 'scheduled',
      destinations: [destination('a', 'scheduled', null, null)],
    };
    expect(pollDelay(scheduled as never, now)).toBe(50 * 60 * 1000);
    expect(pollDelay(scheduled as never, now + 55 * 60 * 1000)).toBe(5000);
    expect(pollDelay({ ...POST, publishSummary: 'completed_all' } as never, now)).toBe(false);
  });
});

describe('copy link', () => {
  it('shows one button, right after the only "View post" link', async () => {
    resolvingClipboard();
    const buttons = await copyButtons(POST);
    expect(buttons).toHaveLength(1);
    const [button] = buttons;
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-label')).toBeNull();
    expect(button?.className).toBe('text-foreground underline underline-offset-4');
    const links = screen.getAllByRole('link', { name: 'View post' });
    expect(links).toHaveLength(1);
    expect(button?.previousElementSibling).toBe(links[0]);
  });

  it('shows no button on a destination without a remote url', async () => {
    const writeText = resolvingClipboard();
    const buttons = await copyButtons({
      ...POST,
      destinations: [
        destination('a', 'published', null, null),
        destination('b', 'failed', 'http://bsky.app/profile/ada/post/9', null),
        destination('c', 'failed', SECOND_URL, null),
      ],
    });
    expect(buttons).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'View post' })).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    await screen.findByText('Link copied.');
    expect(writeText.mock.calls).toEqual([[SECOND_URL]]);
  });

  it('copies the https address and confirms with a status toast', async () => {
    const writeText = resolvingClipboard();
    const [button] = await copyButtons(POST);
    fireEvent.click(button as HTMLElement);
    expect(await toastRole('Link copied.')).toBe('status');
    expect(writeText.mock.calls).toEqual([[FIRST_URL]]);
    expect(screen.queryByText("Couldn't copy the link.")).toBeNull();
    const after = screen.getByRole('button', { name: 'Copy link' });
    expect(after).toBe(button);
    expect((after as HTMLButtonElement).disabled).toBe(false);
    expect(after.textContent).toBe('Copy link');
  });

  it('copies each row its own address', async () => {
    const writeText = resolvingClipboard();
    const buttons = await copyButtons({
      ...POST,
      destinations: [
        destination('a', 'published', FIRST_URL, null),
        destination('c', 'published', SECOND_URL, null),
      ],
    });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1] as HTMLElement);
    fireEvent.click(buttons[0] as HTMLElement);
    await waitFor(() => expect(screen.getAllByText('Link copied.')).toHaveLength(2));
    expect(writeText.mock.calls).toEqual([[SECOND_URL], [FIRST_URL]]);
  });

  it('copies again and raises a second toast on a second click', async () => {
    const writeText = resolvingClipboard();
    const [button] = await copyButtons(POST);
    fireEvent.click(button as HTMLElement);
    fireEvent.click(button as HTMLElement);
    await waitFor(() => expect(screen.getAllByText('Link copied.')).toHaveLength(2));
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(writeText.mock.calls).toEqual([[FIRST_URL], [FIRST_URL]]);
  });

  it('shows an alert toast when the write rejects', async () => {
    const writeText = vi.fn((_text: string) => Promise.reject(new Error('denied')));
    await expectCopyFailure({ writeText });
    expect(writeText.mock.calls).toEqual([[FIRST_URL]]);
  });

  it('shows an alert toast when the clipboard is missing', async () => {
    await expectCopyFailure(undefined);
  });

  it('shows an alert toast when writeText is missing', async () => {
    await expectCopyFailure({});
  });

  it('shows an alert toast when writeText throws', async () => {
    const writeText = vi.fn((_text: string): Promise<void> => {
      throw new Error('blocked');
    });
    await expectCopyFailure({ writeText });
  });

  it.each([
    ['en', 'Copy link', 'Link copied.', "Couldn't copy the link."],
    ['sk', 'Kopírovať odkaz', 'Odkaz je skopírovaný.', 'Odkaz sa nepodarilo skopírovať.'],
    ['cs', 'Kopírovat odkaz', 'Odkaz je zkopírovaný.', 'Odkaz se nepodařilo zkopírovat.'],
  ])('has the three messages in %s', async (locale, label, copied, failed) => {
    const catalogs: Record<string, () => Promise<unknown>> = {
      en: () => import('@kronaut/i18n/messages/en'),
      sk: () => import('@kronaut/i18n/messages/sk'),
      cs: () => import('@kronaut/i18n/messages/cs'),
    };
    const catalog = (await catalogs[locale]?.()) as Catalog;
    expect(catalog.post_copy_link?.({})).toBe(label);
    expect(catalog.post_link_copied?.({})).toBe(copied);
    expect(catalog.post_link_copy_failed?.({})).toBe(failed);
  });
});
