import { describe, expect, it } from 'vitest';
import { type Doc, textToParagraphs } from './doc.ts';
import { draftBody } from './draft-body.ts';
import type { ComposeContent } from './submit.ts';

function doc(text: string): Doc {
  return { type: 'doc', content: textToParagraphs(text) };
}

function content(main: string, replies: string[], comment: string | null): ComposeContent {
  return {
    doc: doc(main),
    images: [],
    video: null,
    replies: replies.map((text) => ({ doc: doc(text) })),
    comment: comment === null ? null : { doc: doc(comment) },
  };
}

const items = (body: ReturnType<typeof draftBody>['items']) =>
  body.map(({ role, doc: d, media }) => [role, d, media]);

describe('draftBody', () => {
  it('emits the main post, then the replies, then the first comment, for base and variant', () => {
    const body = draftBody(
      {
        content: content('Main', ['One', 'Two'], 'Comment'),
        variants: [content('Other', ['Only'], null)],
        destinations: [
          { accountId: 'acct_a', publishType: 'post', variant: null },
          { accountId: 'acct_b', publishType: 'post', variant: 0 },
        ],
        when: { mode: 'asap' },
        request: null,
      },
      new Map(),
    );
    expect(items(body.items)).toEqual([
      ['main', doc('Main'), []],
      ['thread', doc('One'), []],
      ['thread', doc('Two'), []],
      ['comment', doc('Comment'), []],
    ]);
    expect(body.variants?.map((variant) => items(variant.items))).toEqual([
      [
        ['main', doc('Other'), []],
        ['thread', doc('Only'), []],
      ],
    ]);
  });
});
