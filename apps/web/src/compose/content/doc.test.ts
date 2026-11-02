import { isCanonical, schemaV1 } from '@kronaut/compose';
import { describe, expect, it } from 'vitest';
import { docParagraphs, textToParagraphs, toDoc } from './doc.ts';
import { isPlainDoc } from './plain-doc.ts';

describe('isPlainDoc', () => {
  const text = (value: string, extra: Record<string, unknown> = {}) => ({
    type: 'text',
    text: value,
    ...extra,
  });
  const paragraph = (...content: readonly unknown[]) => ({ type: 'paragraph', content });
  const root = (...content: readonly unknown[]) => ({ type: 'doc', content });

  it.each<[string, unknown]>([
    ['text and a hard break', root(paragraph(text('a'), { type: 'hardBreak' }, text('b')))],
    ['adjacent text that toDoc merges', root(paragraph(text('a'), text('b')))],
    ['text that toDoc normalizes', root(paragraph(text('e\u0301')))],
    ['an empty text node', root(paragraph(text('')))],
    ['an empty paragraph', root({ type: 'paragraph' })],
    ['empty marks and attrs', root(paragraph(text('a', { marks: [], attrs: {} })))],
    ['a null attrs', root({ type: 'paragraph', attrs: null, content: [text('a')] })],
    ['an empty document', {}],
  ])('accepts %s', (_name, doc) => {
    expect(isPlainDoc(doc)).toBe(true);
  });

  it.each<[string, unknown]>([
    ['a list', root({ type: 'bulletList', content: [] })],
    ['a heading', root({ type: 'heading', content: [text('a')] })],
    ['a mark', root(paragraph(text('a', { marks: [{ type: 'bold' }] })))],
    ['a mention', root(paragraph({ type: 'mention', attrs: { id: '1' } }))],
    ['paragraph attrs', root({ type: 'paragraph', attrs: { align: 'center' } })],
    ['hard break attrs', root(paragraph({ type: 'hardBreak', attrs: { soft: true } }))],
    ['a text node with no text', root(paragraph({ type: 'text' }))],
    ['a stray paragraph content', root({ type: 'paragraph', content: 'a' })],
    ['a stray root content', { type: 'doc', content: 'a' }],
    ['a stray root key', { type: 'doc', content: [], version: 2 }],
    ['another root type', { type: 'list', content: [] }],
    ['no record', 'text'],
  ])('refuses %s', (_name, doc) => {
    expect(isPlainDoc(doc)).toBe(false);
  });

  it('agrees with toDoc on the text it keeps', () => {
    const doc = root(paragraph(text('a'), text('b')));
    expect(isPlainDoc(doc)).toBe(true);
    expect(docParagraphs(doc)).toEqual([{ key: 'p0', text: 'ab' }]);
  });
});

describe('compose doc', () => {
  it('turns pasted lines into NFC paragraphs that schema v1 accepts', () => {
    const decomposed = 'Pečené kurča';
    const pasted = textToParagraphs(`Ahoj\r\n\n${decomposed}`);
    const doc = toDoc({
      type: 'doc',
      content: [
        ...pasted,
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [{ type: 'text', text: 'č' }, { type: 'hardBreak' }, { type: 'text', text: '' }],
        },
      ],
    });

    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Ahoj' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Pečené kurča' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'č' }, { type: 'hardBreak' }] },
      ],
    });
    expect(schemaV1.nodeFromJSON(doc).check()).toBeUndefined();
    expect(isCanonical(doc)).toBe(true);
  });
});
