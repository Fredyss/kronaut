import type { TextCounting } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { countLinks, countText } from './count.ts';

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}';
const FLAG_SK = '\u{1F1F8}\u{1F1F0}';
const SAMPLE = 'Žluťoučký kůň úpěl ďábelské ódy';

describe('countText', () => {
  it.each<[string, string, TextCounting, number]>([
    ['empty', '', 'graphemes', 0],
    ['empty', '', 'utf16', 0],
    ['empty', '', 'utf8-bytes', 0],
    ['ascii', 'hello', 'graphemes', 5],
    ['ascii', 'hello', 'utf16', 5],
    ['ascii', 'hello', 'utf8-bytes', 5],
    ['ZWJ family emoji', FAMILY, 'graphemes', 1],
    ['ZWJ family emoji', FAMILY, 'utf16', 11],
    ['ZWJ family emoji', FAMILY, 'utf8-bytes', 25],
    ['flag emoji', FLAG_SK, 'graphemes', 1],
    ['flag emoji', FLAG_SK, 'utf16', 4],
    ['flag emoji', FLAG_SK, 'utf8-bytes', 8],
    ['two flags', FLAG_SK + FLAG_SK, 'graphemes', 2],
    ['single astral emoji', '\u{1F600}', 'graphemes', 1],
    ['single astral emoji', '\u{1F600}', 'utf16', 2],
    ['single astral emoji', '\u{1F600}', 'utf8-bytes', 4],
    ['sk/cs sample', SAMPLE, 'graphemes', 31],
    ['sk/cs sample', SAMPLE, 'utf16', 31],
    ['sk/cs sample', SAMPLE, 'utf8-bytes', 43],
    ['newlines', 'a\nb\n\nc', 'graphemes', 6],
    ['CRLF is one grapheme', '\r\n', 'graphemes', 1],
    ['empty', '', 'threads', 0],
    ['ascii', 'hello', 'threads', 5],
    ['Slovak diacritics', 'čaká', 'threads', 4],
    ['single astral emoji', '\u{1F600}', 'threads', 4],
    ['ZWJ family emoji', FAMILY, 'threads', 25],
    ['flag emoji', FLAG_SK, 'threads', 8],
    ['keycap emoji', '1\u{FE0F}\u{20E3}', 'threads', 7],
    ['text-style symbol made emoji', '\u{2764}\u{FE0F}', 'threads', 6],
    ['mixed text', `Ahoj \u{1F44B} čau ${FLAG_SK}!`, 'threads', 23],
    ['sk/cs sample', SAMPLE, 'threads', 31],
  ])('%s counts %s as %s = %i', (_label, text, counting, expected) => {
    expect(countText(text, counting)).toBe(expected);
  });

  it.each<TextCounting>(['graphemes', 'threads', 'utf16', 'utf8-bytes'])(
    'counts NFD and NFC č identically under %s',
    (counting) => {
      expect(countText('č', counting)).toBe(countText('č', counting));
    },
  );

  it('counts č as one character in every strategy that should', () => {
    expect(countText('č', 'graphemes')).toBe(1);
    expect(countText('č', 'utf16')).toBe(1);
    expect(countText('č', 'utf8-bytes')).toBe(2);
  });

  it('gives the same result for a decomposed sk/cs sample as for the composed one', () => {
    const decomposed = SAMPLE.normalize('NFD');
    expect(decomposed).not.toBe(SAMPLE);
    for (const counting of ['graphemes', 'threads', 'utf16', 'utf8-bytes'] as const) {
      expect(countText(decomposed, counting)).toBe(countText(SAMPLE, counting));
    }
  });

  it('counts a letter that only composes in NFC as one UTF-16 unit', () => {
    expect(countText('é', 'utf16')).toBe(1);
  });

  it('refuses x-weighted counting for now', () => {
    expect(() => countText('hello', 'x-weighted')).toThrow(RangeError);
    expect(() => countText('hello', 'x-weighted')).toThrow(
      'x-weighted counting is not supported yet',
    );
  });

  it.each<[string, string, number]>([
    ['plain graphemes', `Ahoj ${FAMILY}${FLAG_SK}`, 7],
    ['a short link costs the full weight', 'see https://a.io', 4 + 23],
    ['a long link costs the full weight', `x https://example.org/${'p'.repeat(200)}?q=1`, 2 + 23],
    ['trailing punctuation is text', 'go https://example.org/a.', 3 + 23 + 1],
    ['two links', 'http://a.io and https://b.io', 23 + 5 + 23],
    ['a scheme alone is text', 'https:// x', 10],
    ['a remote mention counts its username part', '@alice@social.example.org hi', 9],
    ['a local mention counts whole', '@alice hi', 9],
    ['an email address is not a mention', 'mail bob@example.org', 20],
    ['a link containing a mention counts as a link', 'https://x.org/@a@b.org', 23],
  ])('counts %s under mastodon', (_label, text, expected) => {
    expect(countText(text, 'mastodon')).toBe(expected);
  });

  it('applies the server URL weight', () => {
    expect(countText('https://a.io', 'mastodon', { urlWeight: 30 })).toBe(30);
    expect(countText('https://a.io', 'mastodon', { urlWeight: 0 })).toBe(0);
  });

  it('counts decomposed text under mastodon like composed text', () => {
    expect(countText(SAMPLE.normalize('NFD'), 'mastodon')).toBe(31);
  });
});

describe('countLinks', () => {
  it.each<[string, string, number]>([
    ['no link', 'Ahoj svet', 0],
    ['a duplicate counts once', 'https://a.example/x and https://a.example/x', 1],
    ['a URL and its bare form count as two', 'https://a.example/x a.example/x', 2],
    ['a bare www host', 'see www.facebook.com', 1],
    ['a bare host with a path', 'sub.example.co.uk/path', 1],
    ['an email address', 'mail bob@example.org', 0],
    ['an email with a dotted local part', 'mail first.last@example.org', 0],
    ['a dotted name, on purpose', 'built with Node.js', 1],
    ['a remote mention', 'hi @user@host.example', 0],
    ['the host of a matched URL', 'https://host.example/a', 1],
    ['trailing punctuation', 'go to example.com. Or example.com!', 1],
    ['trailing punctuation after a URL', '(https://a.example/x), https://a.example/x.', 1],
    ['a decomposed host as its composed form', 'c\u030c.example č.example', 1],
  ])('counts %s', (_label, text, expected) => {
    expect(countLinks(text)).toBe(expected);
  });
});
