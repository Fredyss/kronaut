import { isCanonical, schemaV1 } from '@kronaut/compose';
import { describe, expect, it } from 'vitest';
import { textToParagraphs, toDoc } from './doc.ts';

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
