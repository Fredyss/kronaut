// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Doc, docParagraphs, textToParagraphs, toDoc } from './doc.ts';
import PostEditor from './editor.tsx';

afterEach(cleanup);

const lastText = (onChange: ReturnType<typeof vi.fn<(doc: Doc) => void>>) =>
  docParagraphs(onChange.mock.lastCall?.[0] as Doc)
    .map((p) => p.text)
    .join('\n');

describe('PostEditor history', () => {
  it('reports a paste, its undo and its redo through onChange', () => {
    const onChange = vi.fn<(doc: Doc) => void>();
    const initial = toDoc({ type: 'doc', content: textToParagraphs('Body') });
    render(<PostEditor id="text" label="Text" initial={initial} onChange={onChange} />);
    const editor = screen.getByRole('textbox', { name: 'Text' });

    fireEvent.paste(editor, { clipboardData: { getData: () => 'Stray' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastText(onChange)).toContain('Stray');

    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true });
    expect(lastText(onChange)).toBe('Body');

    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(lastText(onChange)).toContain('Stray');
  });
});
