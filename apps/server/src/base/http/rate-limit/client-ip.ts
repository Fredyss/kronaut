import { isIP } from 'node:net';

const CLOUDFLARE_HEADER = 'cf-connecting-ip';
const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const V6_GROUPS = 8;
const V6_PREFIX_GROUPS = 4;

interface NodeBindings {
  readonly incoming?: { readonly socket?: { readonly remoteAddress?: string | undefined } };
}

export function socketAddress(env: unknown): string | null {
  if (typeof env !== 'object' || env === null) return null;
  return (env as NodeBindings).incoming?.socket?.remoteAddress ?? null;
}

function withoutZone(address: string): string {
  const zone = address.indexOf('%');
  return zone === -1 ? address : address.slice(0, zone);
}

function valid(address: string | null): string | null {
  if (address === null) return null;
  const bare = withoutZone(address.trim());
  return isIP(bare) === 0 ? null : bare;
}

// X-Forwarded-For is never read, since any client can send it. Cloudflare overwrites this header at its
// edge, and with the Access gate configured the tunnel is the only way in.
export function clientIp(
  request: Request,
  socket: string | null,
  trustCloudflare: boolean,
): string | null {
  const edge = trustCloudflare ? valid(request.headers.get(CLOUDFLARE_HEADER)) : null;
  return edge ?? valid(socket);
}

function groupsOf(part: string | undefined): string[] {
  if (part === undefined || part === '') return [];
  return part.split(':').flatMap((group) => (group.includes('.') ? ['0', '0'] : [group]));
}

function v6Groups(address: string): string[] {
  const [head, tail] = address.split('::');
  const left = groupsOf(head);
  const right = groupsOf(tail);
  const fill = Array.from({ length: V6_GROUPS - left.length - right.length }, () => '0');
  return [...left, ...fill, ...right];
}

export function ipSubject(address: string): string {
  const mapped = MAPPED_V4.exec(address)?.[1];
  if (mapped !== undefined) return mapped;
  if (isIP(address) !== 6) return address;
  const prefix = v6Groups(address.toLowerCase())
    .slice(0, V6_PREFIX_GROUPS)
    .map((group) => Number.parseInt(group, 16).toString(16));
  return `${prefix.join(':')}::/64`;
}
