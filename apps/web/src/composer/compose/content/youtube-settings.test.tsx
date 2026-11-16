// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, channel, mount, pickFiles, post, warmComposer } from '../testing.tsx';

vi.mock('./editor.tsx', async () => ({
  default: (await import('../testing.tsx')).MockEditor,
}));

vi.mock('../../../base/api/retry.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../base/api/retry.ts')>()),
  sleep: () => Promise.resolve(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const VIDEO_ID = 'media_01jbcdefghjkmnpqrstvwxyzvv';
const POST_ID = 'post_01jbcdefghjkmnpqrstvwxyz01';
const MEDIA = '/v1/workspaces/ws_1/media';
const POSTS = '/v1/workspaces/ws_1/posts';
const CHANNELS = [channel('acct_yt', 'youtube', 'Ada on YouTube')];

function video(state: string) {
  return {
    id: VIDEO_ID,
    kind: 'video',
    mime: 'video/mp4',
    bytes: 6,
    width: 1920,
    height: 1080,
    durationMs: 12_000,
    frameRate: 30,
    sha256: null,
    state,
    aiGenerated: false,
    rejectedReason: null,
    duplicateOf: null,
    previewUrl: null,
  };
}

function opened() {
  const base = post('draft', 'draft');
  const doc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
  };
  return {
    ...base,
    id: POST_ID,
    seriesId: null,
    items: [{ position: 0, role: 'main', doc, media: [{ mediaId: VIDEO_ID, position: 0 }] }],
    destinations: [
      {
        ...base.destinations[0],
        accountId: 'acct_yt',
        provider: 'youtube',
        publishType: 'video',
        settings: { title: 'My clip', privacy: 'unlisted' },
      },
    ],
  };
}

function server(call: Call): Response | undefined {
  if (call.path === '/v1/workspaces/ws_1/channels') return Response.json({ items: CHANNELS });
  if (call.path === `${MEDIA}/uploads`) {
    const body = {
      media: video('uploading'),
      partSize: 6,
      partCount: 1,
      expiresAt: '2999-01-01T00:00:00.000Z',
    };
    return Response.json(body, { status: 201 });
  }
  if (call.path.includes('/parts/')) return Response.json({ part: 1, bytes: 6 });
  if (call.path.endsWith('/complete')) return Response.json(video('processing'));
  if (call.path === `${MEDIA}/${VIDEO_ID}`) return Response.json(video('ready'));
  if (call.path === `${POSTS}/${POST_ID}`) return Response.json(opened());
  return undefined;
}

async function youtubeTab(text = '\nLaunch day\nMore below') {
  const mounted = mount(server);
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: text } });
  pickFiles([new File([new Uint8Array(6)], 'clip.mp4', { type: 'video/mp4' })]);
  await screen.findByText(/^Ready/);
  fireEvent.click(screen.getByRole('checkbox', { name: /Ada on YouTube/ }));
  fireEvent.click(await screen.findByRole('tab', { name: /Ada on YouTube/ }));
  return mounted;
}

const title = () => screen.getByLabelText('Title') as HTMLInputElement;
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;

warmComposer();

describe('YouTube settings', () => {
  it('shows the settings on the channel tab with Public selected', async () => {
    await youtubeTab();

    expect(screen.getByRole('group', { name: 'YouTube' })).toBeDefined();
    expect(radio('Public').checked).toBe(true);
    expect(title().value).toBe('');
    expect(screen.getByText('0 / 100')).toBeDefined();
  });

  it('fills the title from the first line of the text', async () => {
    await youtubeTab();
    fireEvent.click(screen.getByRole('button', { name: 'Use first line' }));

    expect(title().value).toBe('Launch day');
    expect(screen.getByText('10 / 100')).toBeDefined();
  });

  it('refuses to schedule without a title and sends nothing', async () => {
    const { mutations } = await youtubeTab();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Add a YouTube title for Ada on YouTube.',
    );
    expect(mutations().some((call) => call.path.startsWith(POSTS))).toBe(false);
  });

  it('saves a draft without a title', async () => {
    const { router, mutations } = await youtubeTab();
    fireEvent.click(screen.getByRole('radio', { name: 'Keep as draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const create = mutations().find((call) => call.path === POSTS);
    expect(create?.body).toHaveProperty(['destinations', 0], {
      accountId: 'acct_yt',
      publishType: 'video',
      settings: { privacy: 'public' },
    });
  });

  it('restores the stored title and visibility when editing', async () => {
    mount(server, `/compose?post=${POST_ID}`);
    fireEvent.click(await screen.findByRole('tab', { name: /Ada on YouTube/ }));

    expect(title().value).toBe('My clip');
    expect(radio('Unlisted').checked).toBe(true);
  });
});
