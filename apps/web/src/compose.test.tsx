// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { channel, MEDIA_ASSET, MEDIA_ID, mount, policy, post } from './compose-testing.tsx';

vi.mock('./compose/editor.tsx', async () => ({
  default: (await import('./compose-testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function fillIn() {
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Hello' } });
  const input = document.querySelector<HTMLInputElement>('input[type=file]');
  if (input === null) throw new Error('no file input');
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'cat.jpg', {
    type: 'image/jpeg',
  });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
  fireEvent.change(await screen.findByLabelText('Alt text for image 1'), {
    target: { value: 'A cat' },
  });
  fireEvent.click(await screen.findByRole('checkbox', { name: /Ada on Bluesky/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Ada on Instagram/ }));
}

const CREATE_BODY = {
  items: [
    {
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
      },
      media: [{ mediaId: MEDIA_ID, altText: 'A cat' }],
    },
  ],
  destinations: [
    { accountId: 'acct_bsky', publishType: 'post' },
    { accountId: 'acct_ig', publishType: 'image' },
  ],
};

describe('composer', () => {
  it('uploads, creates, schedules asap with idempotency keys and opens the post', async () => {
    const { router, mutations } = mount();
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().map((c) => c.path)).toEqual([
      '/v1/workspaces/ws_1/media',
      '/v1/workspaces/ws_1/posts',
      '/v1/workspaces/ws_1/posts/post_1/schedule',
    ]);
    const [upload, create, schedule] = mutations();
    expect(upload?.body).toEqual({ filename: 'cat.jpg', dataBase64: '/9j/4A==' });
    expect(create?.body).toEqual(CREATE_BODY);
    expect(schedule?.body).toEqual({ expectedVersion: 1, mode: 'asap' });
    const keys = mutations().map((c) => c.key);
    expect(keys.every((key) => key !== null && /^[0-9a-f-]{36}$/.test(key))).toBe(true);
    expect(new Set(keys).size).toBe(3);
  });

  it('sends the AI mark with the upload of an image marked AI-generated', async () => {
    const { router, mutations } = mount();
    await fillIn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Image 1 is AI-generated' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations()[0]?.body).toEqual({
      filename: 'cat.jpg',
      dataBase64: '/9j/4A==',
      aiGenerated: true,
    });
  });

  it('stops before attaching an image the workspace already marked AI-generated', async () => {
    const { router, mutations } = mount((call) =>
      call.path.endsWith('/media')
        ? Response.json({ ...MEDIA_ASSET, aiGenerated: true }, { status: 201 })
        : undefined,
    );
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(await screen.findByText(/Image 1 is already marked as AI-generated/)).toBeTruthy();
    expect(mutations().map((c) => c.path.split('/').at(-1))).toEqual(['media']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Image 1 is AI-generated' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations()[1]?.body).toMatchObject({ aiGenerated: true });
  });

  it('retries only the schedule, with the same key, after a 503', async () => {
    const { router, mutations } = mount((call, count) =>
      call.path.endsWith('/schedule') && count === 1
        ? Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 })
        : undefined,
    );
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await screen.findByText("Kronaut can't be reached right now. Try again in a moment.");
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const creates = mutations().filter((c) => c.path === '/v1/workspaces/ws_1/posts');
    const schedules = mutations().filter((c) => c.path.endsWith('/schedule'));
    expect(creates).toHaveLength(1);
    expect(mutations().filter((c) => c.path.endsWith('/media'))).toHaveLength(1);
    expect(schedules).toHaveLength(2);
    expect(schedules[1]?.key).toBe(schedules[0]?.key);
    expect(schedules[1]?.body).toEqual(schedules[0]?.body);
  });

  it('updates the existing draft instead of creating another after an edit', async () => {
    const { router, mutations } = mount((call, count) => {
      if (call.path.endsWith('/schedule') && count === 1) {
        return Response.json(
          {
            error: {
              code: 'preflight_failed',
              message: '',
              details: [{ path: 'destinations.0', code: 'text_too_long' }],
            },
          },
          { status: 422 },
        );
      }
      if (call.method === 'PATCH') return Response.json({ ...post('draft', 'draft'), version: 2 });
      return undefined;
    });
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await screen.findByText('Ada on Bluesky: The text is too long for this network.');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /v1/workspaces/ws_1/media',
      'POST /v1/workspaces/ws_1/posts',
      'POST /v1/workspaces/ws_1/posts/post_1/schedule',
      'PATCH /v1/workspaces/ws_1/posts/post_1',
      'POST /v1/workspaces/ws_1/posts/post_1/schedule',
    ]);
    const [, , first, patch, second] = mutations();
    expect(patch?.body).toEqual({
      expectedVersion: 1,
      ...CREATE_BODY,
      items: [
        {
          ...CREATE_BODY.items[0],
          doc: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
          },
        },
      ],
    });
    expect(patch?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(second?.body).toEqual({ expectedVersion: 2, mode: 'asap' });
    expect(second?.key).not.toBe(first?.key);
  });

  it('names the channel a 422 detail points at', async () => {
    mount((call) =>
      call.path === '/v1/workspaces/ws_1/posts'
        ? Response.json(
            {
              error: {
                code: 'unprocessable',
                message: 'The post could not be saved.',
                details: [{ path: 'destinations.1', code: 'too_few_media' }],
              },
            },
            { status: 422 },
          )
        : undefined,
    );
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await screen.findByText(
      'Ada on Instagram: This kind of post needs more images on this network.',
    );
    expect(screen.getByText('destinations.1: too_few_media')).toBeDefined();
  });

  it('disables Instagram until the post has an image', async () => {
    mount();
    const instagram = await screen.findByRole('checkbox', { name: /Ada on Instagram/ });
    expect((instagram as HTMLInputElement).disabled).toBe(true);
    expect(instagram.getAttribute('aria-describedby')).not.toBeNull();
    expect(screen.getByText('Needs at least one image.')).toBeDefined();
    expect(
      (screen.getByRole('checkbox', { name: /Ada on Bluesky/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it('disables a network whose image limit a picked image exceeds', async () => {
    mount();
    await screen.findByLabelText('Text');
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    if (input === null) throw new Error('no file input');
    const big = new File([new Uint8Array(3_000_000)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    fireEvent.change(input);
    await screen.findByLabelText('Alt text for image 1');
    const bluesky = screen.getByRole('checkbox', { name: /Ada on Bluesky/ }) as HTMLInputElement;
    expect(bluesky.disabled).toBe(true);
    expect(
      screen.getByText('An image is larger than the 2 MB this network accepts.'),
    ).toBeDefined();
    expect(
      (screen.getByRole('checkbox', { name: /Ada on Instagram/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it('replays a create whose answer was lost before updating it after an edit', async () => {
    const { router, mutations } = mount((call, count) => {
      if (call.path === '/v1/workspaces/ws_1/posts' && count === 1) {
        return Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 });
      }
      if (call.method === 'PATCH') return Response.json({ ...post('draft', 'draft'), version: 2 });
      return undefined;
    });
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await screen.findByText("Kronaut can't be reached right now. Try again in a moment.");
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /v1/workspaces/ws_1/media',
      'POST /v1/workspaces/ws_1/posts',
      'POST /v1/workspaces/ws_1/posts',
      'PATCH /v1/workspaces/ws_1/posts/post_1',
      'POST /v1/workspaces/ws_1/posts/post_1/schedule',
    ]);
    const [, lost, replay] = mutations();
    expect(replay?.key).toBe(lost?.key);
    expect(replay?.body).toEqual(CREATE_BODY);
  });

  it('disables a network that does not accept a picked image format', async () => {
    mount();
    await screen.findByLabelText('Text');
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    if (input === null) throw new Error('no file input');
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'cat.png', {
      type: 'image/png',
    });
    Object.defineProperty(input, 'files', { value: [png], configurable: true });
    fireEvent.change(input);
    await screen.findByLabelText('Alt text for image 1');
    const instagram = screen.getByRole('checkbox', {
      name: /Ada on Instagram/,
    }) as HTMLInputElement;
    expect(instagram.disabled).toBe(true);
    expect(
      screen.getByText("This network doesn't accept the format of an attached image."),
    ).toBeDefined();
    expect(
      (screen.getByRole('checkbox', { name: /Ada on Bluesky/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it('lets a Mastodon channel take 4 images and refuses a 5th', async () => {
    mount((call) =>
      call.path === '/v1/workspaces/ws_1/channels'
        ? Response.json({ items: [channel('acct_masto', 'mastodon', 'Ada on Mastodon')] })
        : undefined,
    );
    await screen.findByLabelText('Text');
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    if (input === null) throw new Error('no file input');
    const pick = (count: number) => {
      const files = Array.from(
        { length: count },
        (_, index) => new File([new Uint8Array(4)], `cat-${index}.jpg`, { type: 'image/jpeg' }),
      );
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      fireEvent.change(input);
    };
    pick(4);
    await screen.findByLabelText('Alt text for image 4');
    const mastodon = screen.getByRole('checkbox', { name: /Ada on Mastodon/ }) as HTMLInputElement;
    expect(mastodon.disabled).toBe(false);
    pick(1);
    await screen.findByLabelText('Alt text for image 5');
    expect(mastodon.disabled).toBe(true);
    expect(screen.getByText('This network accepts at most 4 images.')).toBeDefined();
  });

  it('requests approval with the picked time when the policy requires it', async () => {
    const { router, mutations } = mount((call) => {
      if (call.path === '/v1/workspaces/ws_1/approval-policy') {
        return Response.json(policy('required'));
      }
      if (call.path.endsWith('/approval-requests'))
        return Response.json(post('in_review', 'draft'));
      return undefined;
    });
    await fillIn();
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-01-02' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText('Note for approvers (optional)'), {
      target: { value: ' Check the date ' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Request approval' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const request = mutations().at(-1);
    expect(request?.path).toBe('/v1/workspaces/ws_1/posts/post_1/approval-requests');
    expect(request?.body).toEqual({
      expectedVersion: 1,
      schedule: {
        scheduleLocal: '2099-01-02T10:30:00',
        scheduleTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      note: 'Check the date',
    });
    expect(mutations().some((c) => c.path.endsWith('/schedule'))).toBe(false);
  });

  it('offers a request when a plain schedule needs approval', async () => {
    const { router, mutations } = mount((call) => {
      if (call.path.endsWith('/schedule')) {
        return Response.json(
          { error: { code: 'approval_required', message: '' } },
          { status: 403 },
        );
      }
      if (call.path.endsWith('/approval-requests'))
        return Response.json(post('in_review', 'draft'));
      return undefined;
    });
    await fillIn();
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await screen.findByText('This post needs an approval before it can be scheduled.');
    const buttons = screen.getAllByRole('button', { name: 'Request approval' });
    fireEvent.click(buttons[buttons.length - 1] as HTMLElement);

    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    expect(mutations().map((c) => c.path.split('/').at(-1))).toEqual([
      'media',
      'posts',
      'schedule',
      'approval-requests',
    ]);
    expect(mutations().at(-1)?.body).toEqual({ expectedVersion: 1 });
  });

  it('starts in instant mode at a future time from the calendar', async () => {
    mount(undefined, '/compose?at=2099-05-04T14:00');
    expect(await screen.findByRole('radio', { name: 'Schedule' })).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Date')).toHaveProperty('value', '2099-05-04');
    expect(screen.getByLabelText('Time')).toHaveProperty('value', '14:00');
  });

  it('ignores a calendar time that has already passed', async () => {
    mount(undefined, '/compose?at=2020-05-04T14:00');
    expect(await screen.findByRole('radio', { name: 'Publish now' })).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.queryByLabelText('Date')).toBeNull();
  });

  it('counts against a selected channel and blocks submitting over the limit', async () => {
    mount();
    const bluesky = await screen.findByRole('checkbox', { name: /Ada on Bluesky/ });
    fireEvent.click(bluesky);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'x'.repeat(12) } });
    expect(await screen.findByText('Bluesky 12/300')).toBeDefined();
    const submit = screen.getByRole('button', { name: 'Publish now' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'x'.repeat(301) } });
    expect((await screen.findByText('Bluesky 301/300')).className).toContain('text-destructive');
    const issue = screen.getByText('Too long for Bluesky (301/300)');
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute('aria-describedby')).toBe(issue.closest('[role=status]')?.id);
    fireEvent.click(bluesky);
    await waitFor(() => expect(submit.disabled).toBe(false));
    expect(screen.queryByText('Bluesky 301/300')).toBeNull();
  });

  it('allows 5 links on Threads and flags a 6th', async () => {
    const threads = channel('acct_threads', 'threads', 'Ada on Threads');
    mount((call) =>
      call.path.endsWith('/channels') ? Response.json({ items: [threads] }) : undefined,
    );
    fireEvent.click(await screen.findByRole('checkbox', { name: /Ada on Threads/ }));
    const links = (count: number) =>
      Array.from({ length: count }, (_, index) => `a${index}.example`).join(' ');
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: links(5) } });
    expect(await screen.findByText('Threads 54/500')).toBeDefined();
    expect(screen.queryByText('Threads allows up to 5 links')).toBeNull();
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: links(6) } });
    expect(await screen.findByText('Threads allows up to 5 links')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Publish now' })).toHaveProperty('disabled', true);
  });
});
