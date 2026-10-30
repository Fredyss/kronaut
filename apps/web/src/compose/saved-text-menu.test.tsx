// @vitest-environment happy-dom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { channel, mount } from './testing.tsx';

const LABEL = 'Insert saved text';
const SIGNATURE = {
  id: 'stx_1',
  name: 'Signature',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Ada' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Studio' }] },
    ],
  },
};

const CHANNEL = {
  ...channel('acct_th', 'threads', 'Ada on Threads'),
  postTypes: [
    {
      id: 'post',
      text: [{ counting: 'threads', max: 500 }],
      maxLinks: 5,
      imageAspect: null,
      video: null,
      thread: { maxItems: 10 },
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mountWith(items: readonly unknown[]) {
  return mount(({ path }) => {
    if (path === '/v1/workspaces/ws_1/saved-texts') return Response.json({ items });
    if (path === '/v1/workspaces/ws_1/channels') return Response.json({ items: [CHANNEL] });
    return undefined;
  });
}

// The first use of a lazy path pays its module load and React's 300 ms Suspense reveal
// throttle, which can outrun the 1 s findBy limit on a busy runner.
beforeAll(async () => {
  mountWith([]);
  const name = composeText.compose_text_label();
  await screen.findByRole('textbox', { name }, { timeout: 20_000 });
  cleanup();
}, 60_000);

async function editor(label = composeText.compose_text_label()) {
  const dom = await screen.findByRole('textbox', { name: label });
  return dom as HTMLElement & { readonly editor: Editor };
}

const text = (dom: { readonly editor: Editor }) => dom.editor.getText({ blockSeparator: '\n' });

async function choose(option: string) {
  const menu = await screen.findByRole<HTMLSelectElement>('combobox', { name: LABEL });
  fireEvent.change(menu, { target: { value: option } });
  return menu;
}

async function pick(option: string) {
  const menu = await choose(option);
  fireEvent.click(screen.getByRole('button', { name: composeText.compose_insert() }));
  await waitFor(() => expect(menu.value).toBe(''));
}

describe('insert saved text', () => {
  it('stays hidden while the workspace has none', async () => {
    mountWith([]);
    await editor();
    expect(screen.queryByRole('combobox', { name: LABEL })).toBeNull();
  });

  it('inserts at the cursor as paragraphs and marks the form dirty', async () => {
    mountWith([SIGNATURE]);
    const dom = await editor();
    dom.editor.commands.setContent('<p>Hi there</p>', { emitUpdate: false });
    dom.editor.commands.setTextSelection(3);
    await pick(SIGNATURE.id);
    expect(dom.editor.getJSON().content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'HiAda' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Studio there' }] },
    ]);
    fireEvent.click(screen.getByRole('link', { name: composeText.compose_back() }));
    const prompt = await screen.findByRole('alertdialog');
    expect(prompt.textContent).toContain(m.post_discard_title());
  });

  it('inserts at the end while no cursor was ever placed', async () => {
    mountWith([SIGNATURE]);
    const dom = await editor();
    dom.editor.commands.setContent('<p>Hi</p>', { emitUpdate: false });
    await pick(SIGNATURE.id);
    expect(text(dom)).toBe('HiAda\nStudio');
    await pick(SIGNATURE.id);
    expect(text(dom)).toBe('HiAda\nStudioAda\nStudio');
  });

  it('inserts nothing until Insert is pressed', async () => {
    mountWith([SIGNATURE]);
    const dom = await editor();
    const menu = await choose(SIGNATURE.id);
    expect(menu.value).toBe(SIGNATURE.id);
    expect(text(dom)).toBe('');
  });

  it('inserts into the box last focused, then the main box once that box is gone', async () => {
    mountWith([SIGNATURE]);
    const main = await editor();
    fireEvent.click(screen.getByRole('checkbox', { name: /Ada on Threads/ }));
    fireEvent.click(screen.getByRole('button', { name: composeText.compose_add_reply() }));
    const replyLabel = composeText.compose_reply_label({ position: 1 });
    const reply = await editor(replyLabel);
    fireEvent.focus(reply);
    await pick(SIGNATURE.id);
    expect(text(reply)).toBe('Ada\nStudio');
    expect(text(main)).toBe('');

    const remove = composeText.compose_remove_reply({ position: 1 });
    fireEvent.click(screen.getByRole('button', { name: remove }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: replyLabel })).toBeNull());
    await pick(SIGNATURE.id);
    expect(text(main)).toBe('Ada\nStudio');
  });
});
