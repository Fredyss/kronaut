const SLUG_MAX = 63;
const FALLBACK = 'brand';

const FOLDS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ł: 'l',
  ħ: 'h',
  ı: 'i',
  þ: 'th',
};

function clip(value: string, max: number): string {
  return value.slice(0, max).replace(/-+$/, '');
}

export function slugBase(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^ -~]/g, (char) => FOLDS[char] ?? '-');
  const slug = clip(folded.replace(/[^a-z0-9]+/g, '-').replace(/^-+/, ''), SLUG_MAX);
  return slug === '' ? FALLBACK : slug;
}

export function slugCandidate(base: string, n: number): string {
  if (n === 1) return base;
  const suffix = `-${n}`;
  return `${clip(base, SLUG_MAX - suffix.length)}${suffix}`;
}

export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  let n = 1;
  while (taken.has(slugCandidate(base, n))) n += 1;
  return slugCandidate(base, n);
}
