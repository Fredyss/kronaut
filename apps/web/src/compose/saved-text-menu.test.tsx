// @vitest-environment happy-dom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { mount } from './testing.tsx';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mountWith(items: readonly unknown[]) {
  return mount(({ path }) =>
    path === '/v1/workspaces/ws_1/saved-texts' ? Response.json({ items }) : undefined,
  );
}

async function editor() {
  const label = composeText.compose_text_label();
  const dom = await screen.findByRole('textbox', { name: label });
  return dom as HTMLElement & { readonly editor: Editor };
}

async function pick(option: string) {
  const menu = await screen.findByRole<HTMLSelectElement>('combobox', { name: LABEL });
  fireEvent.change(menu, { target: { value: option } });
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
    fireEvent.focus(dom);
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
    expect(dom.editor.getText({ blockSeparator: '\n' })).toBe('HiAda\nStudio');
    await pick(SIGNATURE.id);
    expect(dom.editor.getText({ blockSeparator: '\n' })).toBe('HiAda\nStudioAda\nStudio');
  });
});
