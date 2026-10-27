import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import { useLayoutEffect, useRef } from 'react';
import { type Doc, EMPTY_DOC, textToParagraphs, toDoc } from './doc.ts';

export interface PostEditorProps {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly initial?: Doc;
  readonly onChange: (doc: Doc) => void;
}

function insertPlainText(view: EditorView, text: string, at?: number): void {
  const nodes = textToParagraphs(text).map((p) => view.state.schema.nodeFromJSON(p));
  const slice = new Slice(Fragment.fromArray(nodes), 1, 1);
  const tr =
    at === undefined
      ? view.state.tr.replaceSelection(slice)
      : view.state.tr.replaceRange(at, at, slice);
  view.dispatch(tr.scrollIntoView().setMeta('paste', true).setMeta('uiEvent', 'paste'));
}

// ProseMirror parses pasted or dropped HTML through innerHTML, which Trusted Types blocks; only plain text is read.
const plainTextOnly = {
  paste(view: EditorView, event: ClipboardEvent): boolean {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (text !== '') insertPlainText(view, text);
    return true;
  },
  drop(view: EditorView, event: DragEvent): boolean {
    if (view.dragging !== null) return false;
    event.preventDefault();
    const text = event.dataTransfer?.getData('text/plain') ?? '';
    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (text !== '' && pos !== null) insertPlainText(view, text, pos.pos);
    return true;
  },
};

export default function PostEditor({
  id,
  label,
  disabled = false,
  initial = EMPTY_DOC,
  onChange,
}: PostEditorProps) {
  const changed = useRef(onChange);
  useLayoutEffect(() => {
    changed.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, HardBreak],
    content: structuredClone(initial) as JSONContent,
    injectCSS: false,
    immediatelyRender: true,
    editable: !disabled,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class:
          'min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring',
      },
      handleDOMEvents: plainTextOnly,
    },
    onUpdate: ({ editor: current }) => changed.current(toDoc(current.getJSON())),
  });
  useLayoutEffect(() => {
    editor.setEditable(!disabled, false);
  }, [editor, disabled]);
  return <EditorContent editor={editor} />;
}
