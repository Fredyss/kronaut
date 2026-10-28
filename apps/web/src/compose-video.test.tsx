// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, channel, jpeg, mount, pickFiles } from './compose-testing.tsx';

vi.mock('./compose/editor.tsx', async () => ({
  default: (await import('./compose-testing.tsx')).MockEditor,
}));

vi.mock('./compose/video-upload.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./compose/video-upload.ts')>()),
  sleep: () => Promise.resolve(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const VIDEO_ID = 'media_01jbcdefghjkmnpqrstvwxyzvv';
const MEDIA = '/v1/workspaces/ws_1/media';

const REEL = {
  id: 'reel',
  text: [{ counting: 'graphemes', max: 2200 }],
  maxLinks: null,
  imageAspect: null,
  video: {
    mimes: ['video/mp4'],
    maxBytes: 300_000_000,
    minDurationMs: 3000,
    maxDurationMs: 90_000,
    aspect: { min: { width: 9, height: 16 }, max: { width: 16, height: 9 } },
  },
};

const THREADS_VIDEO = {
  id: 'video',
  text: [{ counting: 'threads', max: 500 }],
  maxLinks: 5,
  imageAspect: null,
  video: {
    mimes: ['video/mp4'],
    maxBytes: 1_000_000_000,
    minDurationMs: 1,
    maxDurationMs: 300_000,
    aspect: { min: { width: 1, height: 100 }, max: { width: 10, height: 1 } },
  },
};

const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  { ...channel('acct_ig', 'instagram', 'Ada on Instagram'), postTypes: [REEL] },
  { ...channel('acct_th', 'threads', 'Ada on Threads'), postTypes: [THREADS_VIDEO] },
];

function asset(patch: Record<string, unknown> = {}) {
  return {
    id: VIDEO_ID,
    kind: 'video',
    mime: 'video/mp4',
    bytes: 6,
    width: 1080,
    height: 1920,
    durationMs: 12_000,
    sha256: null,
    state: 'ready',
    aiGenerated: false,
    rejectedReason: null,
    duplicateOf: null,
    ...patch,
  };
}

type Ready = Record<string, unknown>;

function videoServer(ready: Ready = {}) {
  return (call: Call, count: number): Response | undefined => {
    if (call.path === '/v1/workspaces/ws_1/channels') return Response.json({ items: CHANNELS });
    if (call.path === `${MEDIA}/uploads`) {
      const media = asset({ state: 'uploading', durationMs: null });
      const body = { media, partSize: 4, partCount: 2, expiresAt: '2026-10-28T08:00:00.000Z' };
      return Response.json(body, { status: 201 });
    }
    if (call.path.includes('/parts/')) return Response.json({ part: 1, bytes: 4 });
    if (call.path.endsWith('/complete')) return Response.json(asset({ state: 'processing' }));
    if (call.path.endsWith('/ai-generated')) return Response.json(asset({ aiGenerated: true }));
    if (call.path === `${MEDIA}/${VIDEO_ID}`) {
      return Response.json(count === 1 ? asset({ state: 'processing' }) : asset(ready));
    }
    return undefined;
  };
}

function mp4(name = 'clip.mp4', bytes = 6): File {
  return new File([new Uint8Array(bytes)], name, { type: 'video/mp4' });
}

async function pickVideo(ready: Ready = {}) {
  const mounted = mount(videoServer(ready));
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Watch' } });
  pickFiles([mp4()]);
  return mounted;
}

const instagram = () =>
  screen.getByRole('checkbox', { name: /Ada on Instagram/ }) as HTMLInputElement;

describe('composer video', () => {
  it('uploads a picked video, polls it to ready and publishes it as an Instagram Reel', async () => {
    const { router, mutations } = await pickVideo();
    expect(await screen.findByText(/^Ready, 12 sec/)).toBeDefined();
    fireEvent.click(instagram());
    const preview = await screen.findByLabelText('Video preview');
    expect(preview.tagName).toBe('VIDEO');
    expect(preview.getAttribute('src')).toMatch(/^blob:/);
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().map((c) => `${c.method} ${c.path.replace(MEDIA, '')}`)).toEqual([
      'POST /uploads',
      `PUT /${VIDEO_ID}/parts/1`,
      `PUT /${VIDEO_ID}/parts/2`,
      `POST /${VIDEO_ID}/complete`,
      'POST /v1/workspaces/ws_1/posts',
      'POST /v1/workspaces/ws_1/posts/post_1/schedule',
    ]);
    const [upload, first, second, complete, create] = mutations();
    expect(upload?.body).toEqual({
      kind: 'video',
      bytes: 6,
      mime: 'video/mp4',
      filename: 'clip.mp4',
    });
    expect([first?.body, second?.body]).toEqual([{ bytes: 4 }, { bytes: 2 }]);
    expect(upload?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(complete?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(create?.body).toMatchObject({
      items: [{ media: [{ mediaId: VIDEO_ID }] }],
      destinations: [{ accountId: 'acct_ig', publishType: 'reel' }],
    });
    expect(create?.body).not.toHaveProperty(['items', 0, 'media', 0, 'altText']);
  });

  it('publishes a video to Threads with its trimmed alt text', async () => {
    const { router, mutations } = await pickVideo();
    await screen.findByText(/^Ready/);
    fireEvent.change(screen.getByLabelText('Alt text for the video'), {
      target: { value: '  A cat on a sofa  ' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Ada on Threads/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const create = mutations().find((c) => c.path === '/v1/workspaces/ws_1/posts');
    expect(create?.body).toMatchObject({
      items: [{ media: [{ mediaId: VIDEO_ID, altText: 'A cat on a sofa' }] }],
      destinations: [{ accountId: 'acct_th', publishType: 'video' }],
    });
  });

  it('shows why a video was rejected and blocks submitting', async () => {
    const { mutations } = await pickVideo({
      state: 'rejected',
      rejectedReason: 'video_stream_missing',
    });
    expect(await screen.findByText('The file has no video track.')).toBeDefined();
    fireEvent.click(instagram());
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() =>
      expect(screen.getAllByText('The file has no video track.')).toHaveLength(2),
    );
    expect(mutations().some((c) => c.path.endsWith('/posts'))).toBe(false);
  });

  it('flags a ready video that breaks the Reel rules', async () => {
    await pickVideo({ durationMs: 120_000 });
    await screen.findByText(/^Ready/);
    fireEvent.click(instagram());

    expect(
      await screen.findByText('The video is longer than Instagram allows (1 min, 30 sec).'),
    ).toBeDefined();
    expect(
      (screen.getByRole('button', { name: 'Publish now' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('keeps images and a video apart', async () => {
    const { mutations } = mount(videoServer());
    await screen.findByLabelText('Text');
    pickFiles([jpeg('cat.jpg')]);
    await screen.findByLabelText('Alt text for image 1');
    pickFiles([mp4()]);
    expect(await screen.findByText('A post can have images or one video, not both.')).toBeDefined();
    expect(mutations().some((c) => c.path.endsWith('/uploads'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    pickFiles([mp4()]);
    await screen.findByText(/^Ready/);
    pickFiles([jpeg('dog.jpg')]);
    expect(await screen.findByText('A post can have images or one video, not both.')).toBeDefined();
    expect(screen.queryByLabelText('Alt text for image 1')).toBeNull();
  });

  it('refuses a second video and a file over 300 MB', async () => {
    mount(videoServer());
    await screen.findByLabelText('Text');
    pickFiles([mp4('a.mp4'), mp4('b.mp4')]);
    expect(await screen.findByText('A post can have only one video.')).toBeDefined();
    const big = mp4('big.mp4');
    Object.defineProperty(big, 'size', { value: 300_000_001 });
    pickFiles([big]);
    expect(await screen.findByText('big.mp4: the video is larger than 300 MB.')).toBeDefined();
  });

  it('shows video as not supported yet on the other networks', async () => {
    await pickVideo();
    await screen.findByText(/^Ready/);
    const bluesky = screen.getByRole('checkbox', { name: /Ada on Bluesky/ }) as HTMLInputElement;
    expect(bluesky.disabled).toBe(true);
    expect(screen.getByText("Video isn't supported on this network yet.")).toBeDefined();
    expect(instagram().disabled).toBe(false);
  });

  it('marks a ready video as AI-generated and then locks the label', async () => {
    const { mutations } = await pickVideo();
    await screen.findByText(/^Ready/);
    const box = screen.getByRole('checkbox', { name: 'The video is AI-generated' });
    fireEvent.click(box);

    await waitFor(() => expect((box as HTMLInputElement).disabled).toBe(true));
    expect((box as HTMLInputElement).checked).toBe(true);
    expect(mutations().filter((c) => c.path.endsWith('/ai-generated'))).toHaveLength(1);
    expect(mutations().at(-1)?.path).toBe(`${MEDIA}/${VIDEO_ID}/ai-generated`);
    expect(screen.getByText(/the label can't be removed/)).toBeDefined();
  });

  it('keeps a Reel back until a failed AI label is saved', async () => {
    const server = videoServer();
    const { mutations } = mount((call, count) =>
      call.path.endsWith('/ai-generated') && count === 1
        ? Response.json({ error: { code: 'conflict', message: '' } }, { status: 409 })
        : server(call, count),
    );
    fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Watch' } });
    pickFiles([mp4()]);
    await screen.findByText(/^Ready/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'The video is AI-generated' }));
    expect(await screen.findByRole('alert')).toBeDefined();
    fireEvent.click(instagram());
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() =>
      expect(screen.getAllByText("The AI label couldn't be saved.").length).toBeGreaterThan(1),
    );
    expect(mutations().some((c) => c.path.endsWith('/posts'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const box = screen.getByRole('checkbox', { name: 'The video is AI-generated' });
    await waitFor(() => expect((box as HTMLInputElement).disabled).toBe(true));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(mutations().filter((c) => c.path.endsWith('/ai-generated'))).toHaveLength(2);
  });

  it('restarts a failed upload on Retry', async () => {
    const server = videoServer();
    const { mutations } = mount((call, count) =>
      call.path.endsWith('/parts/1') && count === 1
        ? Response.json({ error: { code: 'conflict', message: '' } }, { status: 409 })
        : server(call, count),
    );
    await screen.findByLabelText('Text');
    pickFiles([mp4()]);
    expect(await screen.findByText("The video couldn't be uploaded.")).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(/^Ready/)).toBeDefined();
    expect(mutations().filter((c) => c.path.endsWith('/uploads'))).toHaveLength(2);
  });
});
