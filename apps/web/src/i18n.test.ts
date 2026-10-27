import { describe, expect, it } from 'vitest';
import { applyLocale, loadLocale, m } from './i18n.ts';

describe('i18n', () => {
  it('loads a locale before it can be applied', async () => {
    expect(() => applyLocale('cs')).toThrow();
    await loadLocale('cs');
    applyLocale('cs');
    expect(m.account_logout()).toBe('Odhlásit se');
    applyLocale('en');
    expect(m.account_logout()).toBe('Sign out');
  });
});
