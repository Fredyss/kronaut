import { TLDS } from './tlds.ts';

const SCALE = 100;
const DEFAULT_WEIGHT = 200;
const URL_WEIGHT = 23 * SCALE;
const LIGHT_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

const KNOWN_TLDS: ReadonlySet<string> = new Set(TLDS.split(' '));
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const LABEL = String.raw`[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]{0,61}[\p{L}\p{N}\p{M}])?`;
const PATH = String.raw`[!#-;=?-~\p{Script=Latin}\p{Script=Cyrillic}\p{M}]`;
const URL_CANDIDATE = new RegExp(
  String.raw`(?:(?<![\p{L}\p{N}\p{M}_@#$])https?:\/\/${LABEL}(?:\.${LABEL})*` +
    String.raw`|(?<![\p{L}\p{N}\p{M}_@#$.\/:-])(${LABEL}(?:\.${LABEL})+)(?![@_\p{L}\p{N}\p{M}-]|\.[\p{L}\p{N}]))` +
    String.raw`(?::\d{1,5})?(?:[\/?#]${PATH}*)?`,
  'giu',
);
const TRAILING_PUNCTUATION = /[.,;:!?'*]$/;
const CLOSERS: Readonly<Record<string, string>> = { ')': '(', ']': '[', '}': '{' };
const EMOJI_MARK = /\p{Regional_Indicator}|\u{FE0F}|\u{20E3}|\u{200D}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/gu;

export interface XUrl {
  readonly url: string;
  readonly start: number;
  readonly end: number;
}

function unbalanced(url: string, closer: string): boolean {
  const opener = CLOSERS[closer];
  if (opener === undefined) return false;
  return url.split(closer).length > url.split(opener).length;
}

function trimTail(url: string): string {
  let trimmed = url;
  for (;;) {
    const last = trimmed.at(-1) ?? '';
    if (TRAILING_PUNCTUATION.test(last) || unbalanced(trimmed, last))
      trimmed = trimmed.slice(0, -1);
    else return trimmed;
  }
}

function asciiTld(host: string): string | undefined {
  const label = host.split('.').at(-1) ?? '';
  if (/^[\x21-\x7e]+$/.test(label)) return label.toLowerCase();
  try {
    return new URL(`http://${host}`).hostname.split('.').at(-1);
  } catch {
    return undefined;
  }
}

function linkedBare(host: string, url: string): boolean {
  if (/^www\./i.test(host)) return true;
  const tld = asciiTld(host);
  if (tld === undefined || !KNOWN_TLDS.has(tld)) return false;
  return tld.length !== 2 || /^(?::\d{1,5})?\//.test(url.slice(host.length));
}

export function extractXUrls(text: string): XUrl[] {
  const normalized = text.normalize('NFC');
  const urls: XUrl[] = [];
  for (const match of normalized.matchAll(URL_CANDIDATE)) {
    const bare = match[1];
    const url = trimTail(match[0]);
    if (bare !== undefined && !linkedBare(bare, url)) continue;
    urls.push({ url, start: match.index, end: match.index + url.length });
  }
  return urls;
}

function codePointWeight(codePoint: number): number {
  return LIGHT_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end)
    ? SCALE
    : DEFAULT_WEIGHT;
}

function isEmoji(cluster: string): boolean {
  const pictographs = [...cluster.matchAll(PICTOGRAPHIC)];
  if (EMOJI_MARK.test(cluster)) return pictographs.length > 0 || /\u{20E3}|\p{RI}/u.test(cluster);
  return pictographs.some(([char]) => codePointWeight(char.codePointAt(0) ?? 0) === DEFAULT_WEIGHT);
}

function textWeight(text: string): number {
  let weight = 0;
  for (const { segment } of graphemes.segment(text)) {
    if (isEmoji(segment)) {
      weight += DEFAULT_WEIGHT;
      continue;
    }
    for (const char of segment) weight += codePointWeight(char.codePointAt(0) ?? 0);
  }
  return weight;
}

export function countXWeighted(text: string): number {
  const normalized = text.normalize('NFC');
  let weight = 0;
  let from = 0;
  for (const { start, end } of extractXUrls(normalized)) {
    weight += textWeight(normalized.slice(from, start)) + URL_WEIGHT;
    from = end;
  }
  weight += textWeight(normalized.slice(from));
  return weight / SCALE;
}
