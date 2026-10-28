import { describe, expect, it } from 'vitest';
import { cliLocale } from './cli.ts';

describe('cliLocale', () => {
  it('takes the language of the first set of LC_ALL, LC_MESSAGES and LANG', () => {
    expect(cliLocale({ LC_ALL: 'cs_CZ.UTF-8', LC_MESSAGES: 'sk_SK.UTF-8', LANG: 'en_US' })).toBe(
      'cs',
    );
    expect(cliLocale({ LC_ALL: '', LC_MESSAGES: 'sk_SK.UTF-8', LANG: 'cs_CZ' })).toBe('sk');
    expect(cliLocale({ LANG: 'sk_SK.UTF-8' })).toBe('sk');
    expect(cliLocale({ LANG: 'cs' })).toBe('cs');
    expect(cliLocale({ LC_ALL: 'C', LANG: 'sk_SK.UTF-8' })).toBe('en');
    for (const value of ['C', 'POSIX', 'C.UTF-8', '', 'de_DE.UTF-8']) {
      expect(cliLocale({ LANG: value })).toBe('en');
    }
    expect(cliLocale({})).toBe('en');
  });
});
