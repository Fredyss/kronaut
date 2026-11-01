export const ID_PREFIXES = {
  workspace: 'ws',
  user: 'usr',
  post: 'post',
  destination: 'dest',
  socialAccount: 'acct',
  media: 'media',
  attempt: 'att',
  brand: 'brand',
  location: 'loc',
  group: 'grp',
  campaign: 'camp',
  notification: 'ntf',
  approvalRequest: 'apr',
  grant: 'grant',
  series: 'ser',
  tag: 'tag',
  savedText: 'stx',
  mediaImport: 'mimp',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const SUFFIX_LENGTH = 26;
const MAX_FIRST_INDEX = 7;
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function encodePublicId(kind: IdKind, uuid: string): string {
  if (!UUID_PATTERN.test(uuid)) {
    throw new TypeError('uuid must be a canonical 8-4-4-4-12 uuid string');
  }
  let rest = BigInt(`0x${uuid.replaceAll('-', '')}`);
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix = ALPHABET.charAt(Number(rest & 31n)) + suffix;
    rest >>= 5n;
  }
  return `${ID_PREFIXES[kind]}_${suffix}`;
}

export function decodePublicId(kind: IdKind, value: string): string | null {
  const head = `${ID_PREFIXES[kind]}_`;
  if (!value.startsWith(head)) {
    return null;
  }
  const suffix = value.slice(head.length);
  if (suffix.length !== SUFFIX_LENGTH) {
    return null;
  }
  let acc = 0n;
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    const index = ALPHABET.indexOf(suffix.charAt(i));
    if (index < 0 || (i === 0 && index > MAX_FIRST_INDEX)) {
      return null;
    }
    acc = (acc << 5n) | BigInt(index);
  }
  const hex = acc.toString(16).padStart(32, '0');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
