import { describe, expect, it } from 'vitest';
import { isAllowed } from './policy.ts';

describe('isAllowed', () => {
  it('judges a single license', () => {
    expect(isAllowed('a', 'MIT')).toBe(true);
    expect(isAllowed('a', 'GPL-3.0-only')).toBe(false);
  });

  it('passes OR when any part is allowed', () => {
    expect(isAllowed('a', 'GPL-3.0-only OR MIT')).toBe(true);
    expect(isAllowed('a', 'GPL-3.0-only OR AGPL-3.0-only')).toBe(false);
  });

  it('fails AND when any part is blocked', () => {
    expect(isAllowed('a', 'MIT AND ISC')).toBe(true);
    expect(isAllowed('a', 'MIT AND GPL-3.0-only')).toBe(false);
  });

  it('honours parentheses', () => {
    expect(isAllowed('a', '(MIT OR GPL-3.0-only)')).toBe(true);
    expect(isAllowed('a', '(MIT OR GPL-3.0-only) AND AGPL-3.0-only')).toBe(false);
    expect(isAllowed('a', '(MIT AND ISC')).toBe(false);
  });

  it('rejects Unknown and unparseable expressions', () => {
    expect(isAllowed('a', 'Unknown')).toBe(false);
    expect(isAllowed('a', 'MIT AND')).toBe(false);
    expect(isAllowed('a', '')).toBe(false);
  });

  it('allows a package listed in the exceptions', () => {
    expect(
      isAllowed('sharp', 'LGPL-3.0-or-later', { sharp: 'libvips is dynamically linked' }),
    ).toBe(true);
    expect(isAllowed('other', 'LGPL-3.0-or-later', { sharp: 'x' })).toBe(false);
  });
});
