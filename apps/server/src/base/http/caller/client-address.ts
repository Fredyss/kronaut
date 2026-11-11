import { isIP } from 'node:net';

const CLOUDFLARE_HEADER = 'cf-connecting-ip';
const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const V6_GROUPS = 8;
const V6_PREFIX_GROUPS = 3;

function v4Prefix(address: string): string {
  return `${address.split('.').slice(0, 3).join('.')}.0/24`;
}

function v6Prefix(address: string): string {
  const [head = '', tail] = address.split('::');
  const left = head === '' ? [] : head.split(':');
  const right = tail === undefined || tail === '' ? [] : tail.split(':');
  const width = right.length + (right.at(-1)?.includes('.') ? 1 : 0);
  const gap = tail === undefined ? 0 : V6_GROUPS - left.length - width;
  const groups = [...left, ...Array.from({ length: gap }, () => '0'), ...right];
  const kept = groups.slice(0, V6_PREFIX_GROUPS).map((group) => Number.parseInt(group, 16));
  return `${kept.map((group) => group.toString(16)).join(':')}::/48`;
}

export function addressPrefix(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const plain = MAPPED_V4.exec(address)?.[1] ?? address;
  const family = isIP(plain);
  if (family === 4) return v4Prefix(plain);
  if (family === 6 && !plain.includes('%')) return v6Prefix(plain);
  return null;
}

// Cloudflare sets cf-connecting-ip itself, so it is trusted only on a request whose Access
// assertion was verified: that request came through Cloudflare. X-Forwarded-For is never read.
export function clientPrefix(
  accessVerified: boolean,
  request: Request,
  remoteAddress: string | undefined,
): string | null {
  const forwarded = accessVerified ? addressPrefix(request.headers.get(CLOUDFLARE_HEADER)) : null;
  return forwarded ?? addressPrefix(remoteAddress);
}
