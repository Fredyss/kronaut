// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  channel,
  MEDIA_ASSET,
  MEDIA_ID,
  mount,
  type Override,
  policy,
  post,
} from './compose-testing.tsx';

vi.mock('./compose/editor.tsx', async () => ({
  default: (await import('./compose-testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const POST_ID = 'post_01jbcdefghjkmnpqrstvwxyz01';
const POST_PATH = `/v1/workspaces/ws_1/posts/${POST_ID}`;
const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  channel('acct_th', 'threads', 'Ada on Threads'),
];

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

function item(text: string, media: readonly string[] = []) {
  return {
    position: 0,
    role: 'main',
    doc: doc(text),
    media: media.map((mediaId, position) => ({ mediaId, altText: 'A cat', position })),
  };
}

function draft(fields: Record<string, unknown> = {}) {
  const base = post('draft', 'draft');
  const [first, second] = base.destinations;
  return {
    ...base,
    id: POST_ID,
    version: 4,
    seriesId: null,
    items: [item('Hello', [MEDIA_ID])],
    variants: [{ items: [item('Custom', [MEDIA_ID])] }],
    destinations: [
      {
        ...first,
        accountId: 'acct_bsky',
        publishType: 'post',
        variant: null,
        settings: { kept: true },
        deliveryMode: 'reminder',
      },
      { ...second, accountId: 'acct_th', publishType: 'post', variant: 0 },
    ],
    ...fields,
  };
}

function start(
  opened: unknown,
  override: Override = () => undefined,
  url = `/compose?post=${POST_ID}`,
) {
  return mount((call, count) => {
    const replaced = override(call, count);
    if (replaced !== undefined) return replaced;
    if (call.path.endsWith('/channels')) return Response.json({ items: CHANNELS });
    if (call.path.endsWith(`/media/${MEDIA_ID}`)) {
      return Response.json({ ...MEDIA_ASSET, previewUrl: 'https://cdn.test/cat.jpg' });
    }
    if (call.path === POST_PATH) return Response.json(opened);
    if (call.path === '/v1/workspaces/ws_1/posts') {
      return Response.json({ items: [], truncated: false });
    }
    return undefined;
  }, url);
}

const save = () => screen.findByRole('button', { name: 'Save draft' });

function scheduledDraft(fields: Record<string, unknown>) {
  const destinations = draft().destinations.map((d) => ({ ...d, state: 'scheduled' }));
  return draft({ publishSummary: 'scheduled', destinations, ...fields });
}

describe('composer edit mode', () => {
  it('saves an edited draft with the same media and no schedule', async () => {
    const { router, mutations } = start(draft());
    const editor = (await screen.findByLabelText('Text')) as HTMLTextAreaElement;
    expect(editor.value).toBe('Hello');
    expect((screen.getByRole('radio', { name: 'Keep as draft' }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.queryByText(/Repeat/)).toBeNull();
    fireEvent.change(editor, { target: { value: 'Hello again' } });
    fireEvent.click(await save());

    await waitFor(() => expect(router.state.location.pathname).toBe(`/posts/${POST_ID}`));
    expect(mutations().map((call) => `${call.method} ${call.path}`)).toEqual([
      `PATCH ${POST_PATH}`,
    ]);
    expect(mutations()[0]?.body).toEqual({
      expectedVersion: 4,
      items: [
        { role: 'main', doc: doc('Hello again'), media: [{ mediaId: MEDIA_ID, altText: 'A cat' }] },
      ],
      variants: [
        {
          items: [
            { role: 'main', doc: doc('Custom'), media: [{ mediaId: MEDIA_ID, altText: 'A cat' }] },
          ],
        },
      ],
      destinations: [
        {
          accountId: 'acct_bsky',
          publishType: 'post',
          settings: { kept: true },
          deliveryMode: 'reminder',
        },
        {
          accountId: 'acct_th',
          publishType: 'post',
          settings: {},
          deliveryMode: 'auto',
          variant: 0,
        },
      ],
    });
  });

  it('locks the AI mark of an existing image', async () => {
    start(draft());
    const mark = (await screen.findByRole('checkbox', {
      name: /AI/,
    })) as HTMLInputElement;
    expect(mark.disabled).toBe(true);
  });

  it('says the post changed and reloads it from fresh data', async () => {
    let reads = 0;
    start(draft(), (call) => {
      if (call.method === 'PATCH') {
        const error = { code: 'version_conflict', message: 'changed' };
        return Response.json({ error }, { status: 409 });
      }
      if (call.method === 'GET' && call.path === POST_PATH) {
        reads += 1;
        return Response.json(draft({ items: [item(reads > 1 ? 'Theirs' : 'Hello', [MEDIA_ID])] }));
      }
      return undefined;
    });
    fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Mine' } });
    fireEvent.click(await save());
    await screen.findByText(/This post changed after you opened it/);
    fireEvent.click(screen.getByRole('button', { name: 'Reload the post' }));

    await waitFor(() =>
      expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe('Theirs'),
    );
    expect(screen.queryByText(/This post changed after you opened it/)).toBeNull();
  });

  it('shows that a failed save left the post a draft', async () => {
    const scheduled = scheduledDraft({
      scheduleMode: 'instant',
      scheduleLocal: '2999-03-01T09:30:00',
      scheduleTz: 'Europe/Vienna',
    });
    start(scheduled, (call) => {
      if (call.path.endsWith('/unschedule')) return Response.json({ ...draft(), version: 5 });
      if (call.method !== 'PATCH') return undefined;
      return Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 });
    });
    const date = (await screen.findByLabelText('Date')) as HTMLInputElement;
    expect(date.value).toBe('2999-03-01');
    fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Mine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    await screen.findByText('The post is now a draft. Saving again continues from there.');
  });

  it('notes an open approval request and a series', async () => {
    start(draft({ publishSummary: 'in_review', seriesId: 'ser_1' }));
    await screen.findByText('Saving changed content withdraws the open approval request.');
    await screen.findByText('The series schedules a draft again at its next time.');
  });

  it('opens a post scheduled per destination on the queue, with its note', async () => {
    start(scheduledDraft({ scheduleMode: 'local_per_destination' }));
    await screen.findByText(/next free slots/);
    const queue = (await screen.findByRole('radio', { name: 'Add to queue' })) as HTMLInputElement;
    expect(queue.checked).toBe(true);
  });

  it('opens it on a draft where approval hides the queue', async () => {
    const { mutations } = start(
      scheduledDraft({ scheduleMode: 'local_per_destination' }),
      (call) =>
        call.path.endsWith('/approval-policy') ? Response.json(policy('required')) : undefined,
    );
    fireEvent.click(await save());
    expect(screen.queryByText(/next free slots/)).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Add to queue' })).toBeNull();
    expect((screen.getByRole('radio', { name: 'Keep as draft' }) as HTMLInputElement).checked).toBe(
      true,
    );
    await waitFor(() =>
      expect(mutations().map((call) => call.path)).toContain(`${POST_PATH}/unschedule`),
    );
    expect(mutations().some((call) => call.path.endsWith('/approval-requests'))).toBe(false);
  });

  it('asks before closing after a time-only change', async () => {
    const scheduled = scheduledDraft({
      scheduleMode: 'instant',
      scheduleLocal: '2999-03-01T09:30:00',
      scheduleTz: 'Europe/Vienna',
    });
    start(scheduled, undefined, `/?compose=${POST_ID}`);
    fireEvent.change(await screen.findByLabelText('Time'), { target: { value: '10:45' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await screen.findByRole('alertdialog');
  });

  it('sends a post it cannot show whole to the post page, with the reason', async () => {
    const shared = [item('Hello', [MEDIA_ID]), { ...item('Reply', [MEDIA_ID]), role: 'thread' }];
    const { router } = start(draft({ items: shared, variants: [] }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/posts/${POST_ID}`));
    await screen.findByText(/because a reply or comment has media/);
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  });

  it('offers Edit on the post page of an editable post', async () => {
    start(draft(), undefined, `/posts/${POST_ID}`);
    const link = await screen.findByRole('link', { name: 'Edit' });
    expect(link.getAttribute('href')).toBe(`/compose?post=${POST_ID}`);
  });

  it('opens over the calendar and asks before closing only after a change', async () => {
    const { router } = start(draft(), undefined, `/?compose=${POST_ID}`);
    await screen.findByRole('heading', { name: 'Edit post' });
    const close = async () => fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Mine' } });
    await close();
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }));
    fireEvent.change(await screen.findByLabelText('Text'), { target: { value: 'Hello' } });
    await close();
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('compose'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('opens an editable draft from the calendar list, and links the others to the post', async () => {
    const summary = (id: string, state: string) => ({
      id,
      title: `Draft ${state}`,
      excerpt: '',
      mediaCount: 0,
      publishSummary: 'draft',
      updatedAt: '2026-10-24T08:00:00.000Z',
      destinations: [
        { id: `dest_${id}`, accountId: 'acct_bsky', provider: 'bluesky', state, scheduledAt: null },
      ],
    });
    const items = [summary(POST_ID, 'draft'), summary('post_2', 'failed')];
    start(
      draft(),
      (call) =>
        call.method === 'GET' && call.path === '/v1/workspaces/ws_1/posts'
          ? Response.json({ items, truncated: false })
          : undefined,
      '/?view=list',
    );
    const other = await screen.findByRole('link', { name: 'Draft failed' });
    expect(other.getAttribute('href')).toBe('/posts/post_2');
    fireEvent.click(screen.getByRole('link', { name: 'Draft draft' }));
    await screen.findByRole('heading', { name: 'Edit post' });
  });
});
