import { describe, expect, it } from 'vitest';
import { canonicalizeDoc } from './canonical.ts';
import { toPlainText } from './plain-text.ts';
import type { DocJson, NodeJson } from './schema.ts';

const text = (value: string): NodeJson => ({ type: 'text', text: value });
const hardBreak: NodeJson = { type: 'hardBreak' };
const p = (...content: NodeJson[]): NodeJson =>
  content.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content };
const doc = (...content: NodeJson[]): DocJson => ({ type: 'doc', content });

describe('toPlainText', () => {
  it('joins paragraphs with newlines, turns hardBreak into newline and keeps empty paragraphs', () => {
    expect(toPlainText(doc(p(text('a')), p(), p(text('b'), hardBreak, text('c'))))).toBe(
      'a\n\nb\nc',
    );
  });

  it('returns an empty string for a single empty paragraph', () => {
    expect(toPlainText(doc(p()))).toBe('');
  });

  it('returns a single paragraph verbatim', () => {
    expect(toPlainText(doc(p(text('  Žluťoučký kůň  '))))).toBe('  Žluťoučký kůň  ');
  });

  it('keeps consecutive hard breaks', () => {
    expect(toPlainText(doc(p(hardBreak, hardBreak)))).toBe('\n\n');
    expect(toPlainText(doc(p(text('a'), hardBreak)))).toBe('a\n');
  });

  it('keeps trailing empty paragraphs as trailing newlines', () => {
    expect(toPlainText(doc(p(text('a')), p(), p()))).toBe('a\n\n');
  });

  it('works on the output of canonicalizeDoc', () => {
    const canonical = canonicalizeDoc({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'č' }, { type: 'hardBreak' }] },
        { type: 'paragraph' },
      ],
    });
    expect(toPlainText(canonical)).toBe('č\n\n');
  });
});
