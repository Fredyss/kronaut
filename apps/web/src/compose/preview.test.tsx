// @vitest-environment happy-dom
import { toPlainText } from '@kronaut/compose/text';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostEditorProps } from './editor.tsx';
import { channel, jpeg, mount, pickFiles } from './testing.tsx';

vi.mock('./editor.tsx', async () => {
  const { toDoc } = await import('./doc.ts');
  return {
    default: ({ id, label, initial, onChange }: PostEditorProps) => (
      <textarea
        id={id}
        aria-label={label}
        defaultValue={initial === undefined ? '' : JSON.stringify(initial)}
        onChange={(event) => onChange(toDoc(JSON.parse(event.currentTarget.value)))}
      />
    ),
  };
});

vi.mock('./media.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./media.ts')>()),
  thumbnail: async () => 'data:image/jpeg;base64,AA==',
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const IG_ASPECT = { min: { width: 4, height: 5 }, max: { width: 191, height: 100 } };
const IG_TEXT = [{ counting: 'utf16', max: 2200 }];

const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  channel('acct_li', 'linkedin', 'Ada on LinkedIn'),
  {
    ...channel('acct_ig', 'instagram', 'Ada on Instagram'),
    handle: '@ada',
    postTypes: ['image', 'carousel'].map((id) => ({
      id,
      text: IG_TEXT,
      maxLinks: null,
      imageAspect: IG_ASPECT,
    })),
  },
];

const DECOMPOSED = 'Café opens 🎉';

const DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: DECOMPOSED },
        { type: 'hardBreak' },
        { type: 'text', text: 'at nine' },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'See you' }] },
  ],
};

function start() {
  return mount((call) =>
    call.path.endsWith('/channels') ? Response.json({ items: CHANNELS }) : undefined,
  );
}

function write(doc: unknown) {
  fireEvent.change(screen.getByLabelText('Text'), { target: { value: JSON.stringify(doc) } });
}

function paragraph(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

async function select(...names: string[]) {
  await screen.findByLabelText('Text');
  for (const name of names) {
    fireEvent.click(await screen.findByRole('checkbox', { name: new RegExp(name) }));
  }
}

const card = (name: string) => screen.findByRole('article', { name });
const textOf = (article: HTMLElement) => article.querySelector('p')?.textContent;

describe('composer previews', () => {
  it('shows the published text on a short-feed, a pro-feed and a media-grid card', async () => {
    const { router, mutations } = start();
    await screen.findByLabelText('Text');
    pickFiles([jpeg('cat.jpg')]);
    await select('Ada on Bluesky', 'Ada on LinkedIn', 'Ada on Instagram');
    write(DOC);
    const bluesky = await card('Ada on Bluesky');
    const linkedin = await card('Ada on LinkedIn');
    const instagram = await card('Ada on Instagram');
    expect(within(instagram).getByText('@ada')).toBeDefined();
    expect(within(linkedin).getByText('LinkedIn')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/post_1'));
    const body = mutations().find((c) => c.path === '/v1/workspaces/ws_1/posts')?.body as {
      items: { doc: Parameters<typeof toPlainText>[0] }[];
    };
    const [item] = body.items;
    if (item === undefined) throw new Error('no item');
    const published = toPlainText(item.doc);
    expect(published).toBe('Café opens 🎉\nat nine\nSee you');
    expect(textOf(bluesky)).toBe(published);
    expect(textOf(linkedin)).toBe(published);
    expect(textOf(instagram)).toBe(`Ada on Instagram ${published}`);
  });

  it('shows four tiles and the hidden count on Bluesky', async () => {
    start();
    await select('Ada on Bluesky');
    write(paragraph('Cats'));
    pickFiles([1, 2, 3, 4, 5, 6].map((n) => jpeg(`cat-${n}.jpg`)));
    const bluesky = await card('Ada on Bluesky');
    await waitFor(() => expect(within(bluesky).getAllByRole('img')).toHaveLength(4));
    expect(within(bluesky).getByText('+2')).toBeDefined();
  });

  it('crops the first Instagram image to the allowed aspect range', async () => {
    start();
    await screen.findByLabelText('Text');
    pickFiles([jpeg('tall.jpg'), jpeg('wide.jpg')]);
    await select('Ada on Instagram');
    const instagram = await card('Ada on Instagram');
    const image = await within(instagram).findByRole('img', { name: 'Preview of image 1' });
    const box = image.parentElement as HTMLElement;
    expect(box.style.aspectRatio).toBe('1 / 1');
    Object.defineProperties(image, {
      naturalWidth: { value: 1000 },
      naturalHeight: { value: 2000 },
    });
    fireEvent.load(image);
    await waitFor(() => expect(box.style.aspectRatio).toBe('4 / 5'));
  });

  it('shows a customized channel on its own tab only', async () => {
    start();
    await select('Ada on Bluesky', 'Ada on LinkedIn');
    write(paragraph('Hello'));
    fireEvent.click(screen.getByRole('tab', { name: /Ada on Bluesky/ }));
    expect(textOf(await card('Ada on Bluesky'))).toBe('Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Customize for Ada on Bluesky' }));
    write(paragraph('Short'));
    expect(textOf(await card('Ada on Bluesky'))).toBe('Short');
    expect(screen.queryByRole('article', { name: 'Ada on LinkedIn' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /All channels/ }));
    expect(textOf(await card('Ada on LinkedIn'))).toBe('Hello');
    expect(screen.queryByRole('article', { name: 'Ada on Bluesky' })).toBeNull();
  });
});
