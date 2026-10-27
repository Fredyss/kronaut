import { describe, expect, it } from 'vitest';
import { escapeLittleText } from './escape.ts';

describe('little text escaping', () => {
  it.each([
    [
      'every reserved character',
      '\\|{}@[]()<>#*_~',
      '\\\\\\|\\{\\}\\@\\[\\]\\(\\)\\<\\>\\#\\*\\_\\~',
    ],
    ['a backslash before a reserved one', '\\#', '\\\\\\#'],
    [
      'a URL with a parenthesis',
      'https://en.example.org/wiki/Bratislava_(city)',
      'https://en.example.org/wiki/Bratislava\\_\\(city\\)',
    ],
    ['a hashtag', 'Nový #produkt', 'Nový \\#produkt'],
    ['plain text with quotes and an apostrophe', 'It\'s "fine".', 'It\'s "fine".'],
    ['empty text', '', ''],
  ])('escapes %s', (_name, input, expected) => {
    expect(escapeLittleText(input)).toBe(expected);
  });

  it('leaves NFC text composed', () => {
    const nfc = 'Čaká ťa ľadový čaj'.normalize('NFC');
    const escaped = escapeLittleText(`${nfc} *`);
    expect(escaped).toBe(`${nfc} \\*`);
    expect(escaped.normalize('NFC')).toBe(escaped);
  });
});
