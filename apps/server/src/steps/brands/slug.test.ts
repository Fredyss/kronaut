import { describe, expect, it } from 'vitest';
import { freeSlug, slugBase, slugCandidate } from './slug.ts';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

describe('brand slug', () => {
  it('folds accents and other scripts to ASCII where it can', () => {
    expect(slugBase('Žltá Kávička s.r.o.')).toBe('zlta-kavicka-s-r-o');
    expect(slugBase('Straße & Ørsted')).toBe('strasse-orsted');
    expect(slugBase('  --Ahoj--  ')).toBe('ahoj');
  });

  it('falls back when nothing folds', () => {
    expect(slugBase('東京')).toBe('brand');
    expect(slugBase('!!!')).toBe('brand');
  });

  it('stays within the pattern, suffix included', () => {
    const base = slugBase(`${'a'.repeat(61)}-b-c`);
    expect(base).toMatch(SLUG);
    expect(slugCandidate(base, 12)).toMatch(SLUG);
    expect(slugCandidate(base, 12)).toHaveLength(63);
  });

  it('takes the first free suffix', () => {
    expect(freeSlug('acme', new Set())).toBe('acme');
    expect(freeSlug('acme', new Set(['acme', 'acme-2']))).toBe('acme-3');
  });
});
