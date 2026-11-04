import { createHash } from 'node:crypto';

export const LONG_URL_MAX = 32_000;

const UTM = /^utm_/i;

export function linkHash(link: string): Buffer {
  return createHash('sha256').update(link, 'utf8').digest();
}

function hasUtm(url: URL): boolean {
  return [...url.searchParams.keys()].some((name) => UTM.test(name));
}

export function utmTarget(link: string, source: string): string | null {
  const url = URL.parse(link);
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
  if (hasUtm(url)) return link;
  const hash = link.indexOf('#');
  const head = hash === -1 ? link : link.slice(0, hash);
  const tail = hash === -1 ? '' : link.slice(hash);
  const tags = new URLSearchParams({
    utm_source: source,
    utm_medium: 'social',
    utm_campaign: 'kronaut',
  }).toString();
  const separator = !head.includes('?') ? '?' : /[?&]$/.test(head) ? '' : '&';
  const target = `${head}${separator}${tags}${tail}`;
  return target.length > LONG_URL_MAX ? null : target;
}

export function dubExternalId(destinationId: string, hash: Buffer): string {
  return `kronaut_${destinationId}_${hash.toString('hex')}`;
}
