import { describe, expect, it } from 'vitest';
import { countText } from './count.ts';
import { extractXUrls } from './count-x.ts';
import { TLD_VERSION, TLDS } from './tlds.ts';

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}';
const FLAG_SK = '\u{1F1F8}\u{1F1F0}';
const KEYCAP = '1\u{FE0F}\u{20E3}';
const THUMB_TONE = '\u{1F44D}\u{1F3FD}';

const count = (text: string) => countText(text, 'x-weighted');
const urls = (text: string) => extractXUrls(text).map(({ url }) => url);

describe('x-weighted counting', () => {
  it.each<[string, string, number]>([
    ['empty', '', 0],
    ['ascii', 'hello', 5],
    ['latin with diacritics', 'Žluťoučký kůň', 13],
    ['CJK', '日本語', 6],
    ['mixed latin and CJK', 'Tokyo 東京', 10],
    ['general punctuation in and out of the light ranges', '“quote” – ok…', 14],
    ['a symbol outside the light ranges', '™', 2],
    ['copyright sign as text', '©', 1],
    ['astral emoji', '\u{1F600}', 2],
    ['ZWJ family', FAMILY, 2],
    ['flag', FLAG_SK, 2],
    ['two flags', FLAG_SK + FLAG_SK, 4],
    ['keycap', KEYCAP, 2],
    ['skin tone', THUMB_TONE, 2],
    ['emoji with presentation selector', '\u{2764}\u{FE0F}', 2],
  ])('%s', (_name, text, expected) => {
    expect(count(text)).toBe(expected);
  });

  it('normalizes to NFC first', () => {
    expect(count('é')).toBe(1);
    expect(count('Žluva')).toBe(count('Žluva'));
  });

  it('counts every URL as 23, with or without a scheme', () => {
    expect(count('see https://a.io')).toBe(4 + 23);
    expect(count(`see https://example.org/${'long-path/'.repeat(20)}`)).toBe(4 + 23);
    expect(count('see example.com')).toBe(4 + 23);
    expect(count('see www.example.test')).toBe(4 + 23);
    expect(count('пример.рф')).toBe(23);
  });

  it('keeps trailing punctuation and unbalanced brackets out of the URL', () => {
    expect(count('Read https://example.com/a.')).toBe(5 + 23 + 1);
    expect(count('(see example.com)')).toBe(1 + 4 + 23 + 1);
  });

  it('does not count a bare domain with an unknown TLD as a URL', () => {
    expect(count('visit example.notatld')).toBe(21);
    expect(count('v1.2.3')).toBe(6);
  });

  it('counts a bare two-letter TLD host only with a path', () => {
    expect(count('fixed utils.py and main.rs')).toBe(26);
    expect(count('see example.de/a')).toBe(4 + 23);
    expect(count('see www.example.de')).toBe(4 + 23);
    expect(count('see news.bbc.co.uk')).toBe(4 + 23);
    expect(count('see example.co or example.tv')).toBe(4 + 23 + 4 + 23);
  });

  it('counts a scheme URL only with a known TLD', () => {
    expect(count('http://localhost:3000')).toBe(21);
    expect(count('https://intranet/x')).toBe(18);
    expect(count('https://a.io/x')).toBe(23);
  });

  it('does not count an e-mail address as a URL', () => {
    expect(count('ada@example.com')).toBe(15);
    expect(count('ada.lovelace@example.com')).toBe(24);
  });

  it('meets the 280 limit exactly', () => {
    expect(count('a'.repeat(280))).toBe(280);
    expect(count('日'.repeat(140))).toBe(280);
    expect(count(`${'a'.repeat(256)} https://x.com`)).toBe(280);
    expect(count(`${'a'.repeat(257)} https://x.com`)).toBe(281);
  });
});

describe('extractXUrls', () => {
  it('finds scheme, www and bare-domain URLs', () => {
    expect(urls('see https://a.io and www.b.org, or c.com/x?y=1.')).toEqual([
      'https://a.io',
      'www.b.org',
      'c.com/x?y=1',
    ]);
  });

  it('finds nothing in plain text, numbers or handles', () => {
    expect(urls('pi is 3.14, @ada.dev wrote file.notatld')).toEqual([]);
  });

  it('returns offsets into the normalized text', () => {
    expect(extractXUrls('go x.com now')).toEqual([{ url: 'x.com', start: 3, end: 8 }]);
  });
});

describe('bundled TLD list', () => {
  it('is a lowercase IANA list with its version', () => {
    expect(TLD_VERSION).toMatch(/^Version \d{10}, Last Updated /);
    expect(TLDS).toMatch(/^[a-z0-9-]+(?: [a-z0-9-]+)+$/);
  });
});
