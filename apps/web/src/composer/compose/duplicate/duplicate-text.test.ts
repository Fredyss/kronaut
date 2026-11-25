import { describe, expect, it } from 'vitest';
import type { Doc } from '../../../records/posts/doc.ts';
import { type DuplicateTarget, duplicateTexts } from './duplicate-text.tsx';

function target(displayName: string, text: string, provider = 'x_com'): DuplicateTarget {
  const content = text === '' ? [] : [{ type: 'text', text }];
  return {
    channel: { provider, displayName, warnDuplicateText: provider === 'x_com' },
    doc: { type: 'doc', content: [{ type: 'paragraph', content }] } as Doc,
  };
}

describe('duplicateTexts', () => {
  it('groups channels of one provider whose text matches after NFC, trim and whitespace runs', () => {
    expect(
      duplicateTexts([
        target('Ada', ' Café  opens\ttoday '),
        target('Bob', 'Café opens today'),
        target('Cy', 'Something else'),
      ]),
    ).toEqual([{ provider: 'x_com', channels: ['Ada', 'Bob'] }]);
  });

  it('ignores channels without the warning, a single channel and empty text', () => {
    expect(
      duplicateTexts([
        target('Ada', 'Hello'),
        target('Sky', 'Hello', 'bluesky'),
        target('Sea', 'Hello', 'mastodon'),
        target('Bob', ''),
        target('Cy', ' '),
      ]),
    ).toEqual([]);
  });
});
