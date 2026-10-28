// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, createApp } from './app.tsx';

afterEach(cleanup);

const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

const MEDIA = '/v1/workspaces/ws_1/media';

function asset(id: string, extra: object) {
  return {
    id,
    kind: 'image',
    mime: 'image/png',
    bytes: 2_500_000,
    width: 1200,
    height: 800,
    durationMs: null,
    frameRate: null,
    sha256: 'a'.repeat(64),
    state: 'ready',
    aiGenerated: false,
    altText: null,
    createdAt: '2026-10-20T08:00:00.000Z',
    rejectedReason: null,
    duplicateOf: null,
    usageCount: 0,
    previewUrl: null,
    ...extra,
  };
}

const PREVIEW = 'https://media.kronaut.test/abc?exp=1&sig=x';
const USED = asset('media_used', { aiGenerated: true, usageCount: 2, previewUrl: PREVIEW });
const FREE = asset('media_free', { createdAt: '2026-10-19T08:00:00.000Z' });

const USAGE = {
  items: [
    {
      postId: 'post_1',
      title: 'Launch day',
      excerpt: 'Hello',
      publishSummary: 'draft',
      scheduledAt: null,
    },
  ],
};

function mount() {
  const calls: string[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const url = new URL(request.url).pathname;
      calls.push(`${request.method} ${url}`);
      if (url === '/v1/me') return Response.json(ME);
      if (url === MEDIA) return Response.json({ items: [USED, FREE], nextCursor: null });
      if (url === `${MEDIA}/media_used/usage`) return Response.json(USAGE);
      if (url === `${MEDIA}/media_free/usage`) return Response.json({ items: [] });
      if (url === `${MEDIA}/media_used/ai-generated`) {
        return Response.json({ error: { code: 'conflict', message: '' } }, { status: 409 });
      }
      if (url === `${MEDIA}/media_free` && request.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
    },
  });
  const { router, queryClient } = createApp(
    client,
    createMemoryHistory({ initialEntries: ['/media'] }),
  );
  render(<App router={router} queryClient={queryClient} client={client} />);
  return calls;
}

describe('media library', () => {
  it('blocks deleting a used asset and keeps a grant-set AI label', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Image uploaded Oct 20, 2026' }));
    const panel = await screen.findByRole('dialog');
    expect(panel.querySelector('img')?.getAttribute('src')).toBe(PREVIEW);
    expect(within(panel).getByText('Used in 2 posts')).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', true);
    expect(within(panel).getByText('1,200 × 800 px')).toBeTruthy();
    expect(within(panel).getByText('2.5 MB')).toBeTruthy();
    const link = await within(panel).findByRole('link', { name: 'Launch day' });
    expect(link.getAttribute('href')).toBe('/posts/post_1');

    fireEvent.click(within(panel).getByRole('button', { name: 'Remove AI label' }));
    expect(await within(panel).findByRole('alert')).toHaveProperty(
      'textContent',
      'The label stays: an API key or agent uploaded or labelled this file.',
    );
  });

  it('deletes an unused asset after the confirm', async () => {
    const calls = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Image uploaded Oct 19, 2026' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Delete file' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls).toContain(`DELETE ${MEDIA}/media_free`);
    expect(await screen.findByText('File deleted.')).toBeTruthy();
  });
});
