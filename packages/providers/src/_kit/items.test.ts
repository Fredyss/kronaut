import { type ChainLink, isProviderFailure, type MediaRef, type PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { itemPath } from './items.ts';

const main: ChainLink = { position: 0, role: 'main', remoteId: '18000000000000009' };
const image: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/png',
  bytes: 3,
  aiGenerated: false,
};
const comment: PublishItem = { position: 1, role: 'comment', text: 'Prvý komentár', media: [] };

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (isProviderFailure(error) && error.error.kind === 'permanent') return error.error.code;
    throw error;
  }
  return undefined;
}

describe('itemPath comments', () => {
  it('returns the main link for a comment and refuses what a comment cannot carry', () => {
    expect(itemPath({ items: [comment], chain: [main] }, { comments: true })).toEqual({
      kind: 'comment',
      item: comment,
      main,
    });
    const cases: readonly [PublishItem, readonly ChainLink[], string][] = [
      [comment, [], 'comment_parent_missing'],
      [comment, [{ ...main, remoteId: '' }], 'comment_parent_missing'],
      [{ ...comment, media: [image] }, [main], 'comment_media_unsupported'],
      [{ ...comment, text: '  ' }, [main], 'text_empty'],
    ];
    for (const [item, chain, code] of cases)
      expect(codeOf(() => itemPath({ items: [item], chain }, { comments: true }))).toBe(code);
    expect(codeOf(() => itemPath({ items: [comment], chain: [main] }))).toBe('comment_unsupported');
  });
});
