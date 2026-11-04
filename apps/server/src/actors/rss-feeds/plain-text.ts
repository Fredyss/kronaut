const SUMMARY_MAX = 500;
const ELLIPSIS = '…';

const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
};

const ENTITY = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g;
const HIDDEN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<\/?[a-zA-Z][^>]*>/g;

function codePoint(value: number): string {
  const valid = value > 0 && value <= 0x10ffff && (value < 0xd800 || value > 0xdfff);
  return valid ? String.fromCodePoint(value) : '�';
}

function decodeEntity(match: string, body: string): string {
  if (body.startsWith('#x') || body.startsWith('#X')) {
    return codePoint(Number.parseInt(body.slice(2), 16));
  }
  if (body.startsWith('#')) return codePoint(Number.parseInt(body.slice(1), 10));
  return NAMED[body] ?? match;
}

export function decodeEntities(text: string): string {
  return text.replace(ENTITY, decodeEntity);
}

export function htmlToText(html: string): string {
  const stripped = html.replace(HIDDEN, ' ').replace(COMMENT, ' ').replace(TAG, ' ');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

export function cutSummary(text: string): string {
  const chars = [...text];
  if (chars.length <= SUMMARY_MAX) return text;
  const keep = SUMMARY_MAX - ELLIPSIS.length;
  const head = chars.slice(0, keep).join('');
  const space = /\s/.test(chars[keep] ?? '') ? head.length : head.search(/\s\S*$/);
  const cut = space > 0 ? head.slice(0, space) : head;
  return `${cut.trimEnd()}${ELLIPSIS}`;
}
