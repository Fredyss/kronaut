// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, getDefaultNormalizer, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from './app.tsx';
import { pollDelay } from './destinations.ts';

afterEach(cleanup);

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

describe('post status page', () => {
  it('renders destination states and links only to https posts', async () => {
    const client = createApiClient({
      baseUrl: 'http://kronaut.test',
      fetch: async (input) => {
        const path = new URL((input as Request).url).pathname;
        if (path === '/v1/me') return Response.json(ME);
        if (path === '/v1/workspaces/ws_1/channels') return Response.json({ items: [] });
        if (path === '/v1/workspaces/ws_1/posts/post_1') return Response.json(POST);
        return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
      },
    });
    const { router, queryClient } = createApp(
      client,
      createMemoryHistory({ initialEntries: ['/posts/post_1'] }),
    );
    render(<App router={router} queryClient={queryClient} client={client} />);

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
