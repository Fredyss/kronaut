// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { channel, mount, post, warmComposer } from './testing.tsx';

vi.mock('./editor.tsx', async () => ({
  default: (await import('./testing.tsx')).MockEditor,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SIGNATURE = {
  id: 'stx_1',
  name: 'Footer',
  doc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(290) }] }],
  },
};

const CHANNELS = [{ ...channel('acct_bsky', 'bluesky', 'Ada on Bluesky'), signature: SIGNATURE }];

function start() {
  return mount((call) =>
    call.path.endsWith('/channels') ? Response.json({ items: CHANNELS }) : undefined,
  );
}

async function write(text: string) {
  fireEvent.change(await screen.findByLabelText('Text'), { target: { value: text } });
  fireEvent.click(await screen.findByRole('checkbox', { name: /Ada on Bluesky/ }));
}

const POST_ID = 'post_01jbcdefghjkmnpqrstvwxyz01';

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

function scheduledPost() {
  const [destination] = post('scheduled', 'scheduled').destinations;
  return {
    ...post('scheduled', 'scheduled'),
    id: POST_ID,
    seriesId: null,
    scheduleMode: 'instant',
    scheduleLocal: '2999-03-01T09:30:00',
    scheduleTz: 'Europe/Vienna',
    items: [{ position: 0, role: 'main', doc: doc('Twelve chars'), media: [] }],
    destinations: [
      { ...destination, skipSignature: false, signature: doc('Old'), signatureHeld: true },
    ],
  };
}

warmComposer();

describe('channel signature in the composer', () => {
  it('counts the signature against the limit, and the checkbox takes it off', async () => {
    const { mutations } = start();
    await write('Twelve chars');
    expect(await screen.findByText('Bluesky 303/300')).toBeDefined();
    expect(screen.queryByRole('checkbox', { name: 'Add signature “Footer”' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Ada on Bluesky/ }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Add signature “Footer”' }));
    expect(await screen.findByText('Bluesky 12/300')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() => {
      const created = mutations().find((call) => call.path.endsWith('/posts'));
      expect(created?.body).toMatchObject({
        destinations: [{ accountId: 'acct_bsky', skipSignature: true }],
      });
    });
  });

  it('uses the current signature on a scheduled post, because saving freezes again', async () => {
    mount((call) => {
      if (call.path.endsWith('/channels')) return Response.json({ items: CHANNELS });
      return call.path.endsWith(`/posts/${POST_ID}`) ? Response.json(scheduledPost()) : undefined;
    }, `/compose?post=${POST_ID}`);
    expect(await screen.findByText('Bluesky 303/300')).toBeDefined();
  });
});
