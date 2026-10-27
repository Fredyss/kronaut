import type { TextCounting } from '@kronaut/core';

export const DEFAULT_URL_WEIGHT = 23;

export interface CountOptions {
  readonly urlWeight?: number;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const utf8Encoder = new TextEncoder();
const LINK = /(?<![\p{L}\p{N}_])https?:\/\/[^\s<>"]*[^\s<>".,;:!?'")\]]/giu;
const BARE_HOST =
  /(?<![\p{L}\p{N}_@.-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,63}(?![\p{L}\p{N}_@-])(?:\/[^\s<>"]*[^\s<>".,;:!?'")\]])?/gu;
const BYTE_COUNTED = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{FE0F}|\u{20E3}/u;
const REMOTE_MENTION =
  /(?<![\p{L}\p{N}_/=@])(@[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?)@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

function countGraphemes(text: string): number {
  let count = 0;
  for (const _segment of graphemeSegmenter.segment(text)) {
    count++;
  }
  return count;
}

function countThreads(text: string): number {
  let count = 0;
  for (const { segment } of graphemeSegmenter.segment(text)) {
    count += BYTE_COUNTED.test(segment) ? utf8Encoder.encode(segment).length : 1;
  }
  return count;
}

function countMastodon(text: string, urlWeight: number): number {
  let links = 0;
  const rest = text
    .replace(LINK, () => {
      links++;
      return ' ';
    })
    .replace(REMOTE_MENTION, '$1');
  return countGraphemes(rest) - links + links * urlWeight;
}

export function countLinks(text: string): number {
  const links = new Set<string>();
  const rest = text.normalize('NFC').replace(LINK, (url) => {
    links.add(url);
    return ' ';
  });
  for (const [host] of rest.matchAll(BARE_HOST)) links.add(host);
  return links.size;
}

export function countText(
  text: string,
  counting: TextCounting,
  options: CountOptions = {},
): number {
  const normalized = text.normalize('NFC');
  switch (counting) {
    case 'graphemes':
      return countGraphemes(normalized);
    case 'mastodon':
      return countMastodon(normalized, options.urlWeight ?? DEFAULT_URL_WEIGHT);
    case 'threads':
      return countThreads(normalized);
    case 'utf16':
      return normalized.length;
    case 'utf8-bytes':
      return utf8Encoder.encode(normalized).length;
    case 'x-weighted':
      throw new RangeError('x-weighted counting is not supported yet');
  }
}
