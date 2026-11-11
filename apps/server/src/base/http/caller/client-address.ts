import { isIP } from 'node:net';

const CLOUDFLARE_HEADER = 'cf-connecting-ip';
const V6_GROUPS = 8;
const V4_MAPPED = 0xffff;

function v4Prefix(address: string): string {
  return `${address.split('.').slice(0, 3).join('.')}.0/24`;
}

function groupsOf(part: string): number[] {
  if (!part.includes('.')) return [Number.parseInt(part, 16)];
  const [a = 0, b = 0, c = 0, d = 0] = part.split('.').map(Number);
  return [a * 256 + b, c * 256 + d];
}

function v6Groups(address: string): number[] {
  const [head = '', tail] = address.split('::');
  const parse = (side: string) => (side === '' ? [] : side.split(':').flatMap(groupsOf));
  const left = parse(head);
  const right = tail === undefined ? [] : parse(tail);
  const gap = tail === undefined ? 0 : V6_GROUPS - left.length - right.length;
  return [...left, ...Array.from({ length: gap }, () => 0), ...right];
}

function v6Prefix(address: string): string {
  const groups = v6Groups(address);
  const [high = 0, low = 0] = groups.slice(6);
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === V4_MAPPED) {
    return `${high >> 8}.${high & 255}.${low >> 8}.0/24`;
  }
  return `${groups
    .slice(0, 3)
    .map((group) => group.toString(16))
    .join(':')}::/48`;
}

export function addressPrefix(address: string | null | undefined): string | null {
  const plain = address?.split('%')[0] ?? '';
  const family = isIP(plain);
  if (family === 4) return v4Prefix(plain);
  return family === 6 ? v6Prefix(plain) : null;
}

// A verified Access assertion shows who is calling, not which way the request came, so
// cf-connecting-ip is only as good as the tunnel being the one way in. X-Forwarded-For is never read.
export function clientPrefix(
  accessVerified: boolean,
  request: Request,
  remoteAddress: string | undefined,
): string | null {
  const forwarded = accessVerified ? addressPrefix(request.headers.get(CLOUDFLARE_HEADER)) : null;
  return forwarded ?? addressPrefix(remoteAddress);
}
