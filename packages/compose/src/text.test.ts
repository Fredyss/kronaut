import { describe, expect, it } from 'vitest';
import { checkText } from './text.ts';

const RULES = { text: [{ counting: 'threads', max: 500 }], maxLinks: 5 } as const;

function links(count: number): string {
  return Array.from({ length: count }, (_, index) => `https://a.example/${index}`).join(' ');
}

describe('checkText', () => {
  it('allows 5 unique links and flags 6', () => {
    expect(checkText(RULES, [{ text: links(5) }])).toStrictEqual([]);
    expect(checkText(RULES, [{ text: links(6) }])).toStrictEqual([
      { code: 'too_many_links', itemIndex: 0, limit: 5, actual: 6 },
    ]);
  });
});
