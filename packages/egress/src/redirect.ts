import { EgressError } from './errors.ts';
import { parseUrl } from './policy.ts';

export type RedirectMode = Request['redirect'];

export interface Hop {
  url: URL;
  method: string;
  body: string | Uint8Array | undefined;
  readonly headers: Map<string, string>;
  redirects: number;
}

export interface RedirectRules {
  readonly mode: RedirectMode;
  readonly maxRedirects: number;
  readonly sensitive: ReadonlySet<string>;
}

export const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
const CROSS_ORIGIN_STRIPPED_HEADERS: readonly string[] = [
  'authorization',
  'cookie',
  'proxy-authorization',
];
const REQUEST_BODY_HEADERS: readonly string[] = [
  'content-encoding',
  'content-language',
  'content-length',
  'content-location',
  'content-type',
  'transfer-encoding',
];

export function followRedirect(
  hop: Hop,
  status: number,
  location: string,
  rules: RedirectRules,
): void {
  if (rules.mode === 'error') {
    throw new EgressError('too_many_redirects', 'redirects are disabled for this request');
  }
  if (hop.redirects >= rules.maxRedirects) {
    throw new EgressError('too_many_redirects', 'too many redirects');
  }
  hop.redirects += 1;
  const next = parseUrl(location, hop.url);
  if (status !== 307 && status !== 308 && hop.method !== 'GET' && hop.method !== 'HEAD') {
    hop.method = 'GET';
    hop.body = undefined;
    for (const name of REQUEST_BODY_HEADERS) {
      hop.headers.delete(name);
    }
  }
  if (next.origin !== hop.url.origin) {
    for (const name of CROSS_ORIGIN_STRIPPED_HEADERS) {
      hop.headers.delete(name);
    }
    for (const name of rules.sensitive) {
      hop.headers.delete(name);
    }
  }
  hop.url = next;
}
