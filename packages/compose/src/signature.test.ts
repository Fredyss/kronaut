import { describe, expect, it } from 'vitest';
import { isCanonical } from './canonical.ts';
import { toPlainText } from './plain-text.ts';
import type { DocJson } from './schema.ts';
import { appendSignature } from './signature.ts';

function docOf(...lines: string[]): DocJson {
  return {
    type: 'doc',
    content: lines.map((text) =>
      text === ''
        ? { type: 'paragraph' }
        : { type: 'paragraph', content: [{ type: 'text', text }] },
    ),
  };
}

describe('appendSignature', () => {
  it('returns the doc itself without a signature', () => {
    const doc = docOf('Hello');
    expect(appendSignature(doc, null)).toBe(doc);
  });

  it('adds nothing to blank text', () => {
    const blank = docOf('', '  ');
    expect(appendSignature(blank, docOf('Signed'))).toBe(blank);
  });

  it('adds every paragraph after the text, and the result stays canonical', () => {
    const result = appendSignature(docOf('Hello'), docOf('Signed', '', 'Web'));
    expect(toPlainText(result)).toBe('Hello\nSigned\n\nWeb');
    expect(isCanonical(result)).toBe(true);
  });

  it('leaves its inputs alone', () => {
    const doc = docOf('Hello');
    const signature = docOf('Signed');
    const before = JSON.stringify([doc, signature]);
    appendSignature(doc, signature);
    expect(JSON.stringify([doc, signature])).toBe(before);
  });
});
