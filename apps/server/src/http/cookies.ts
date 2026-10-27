import type { CookieOptions } from './types.ts';

const HOST_PREFIX = '__Host-';
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const COOKIE_VALUE = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/;

export function parseCookies(header: string | null): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>();
  if (header === null) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name !== '' && !cookies.has(name)) cookies.set(name, value);
  }
  return cookies;
}

function check(name: string, value: string): void {
  if (!name.startsWith(HOST_PREFIX))
    throw new TypeError(`cookie ${name} must use the __Host- prefix`);
  if (!COOKIE_NAME.test(name)) throw new TypeError(`cookie ${name} has an invalid name`);
  if (!COOKIE_VALUE.test(value)) throw new TypeError(`cookie ${name} has an invalid value`);
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  check(name, value);
  const maxAge = Math.max(0, Math.floor(options.maxAgeSeconds));
  return [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'Secure',
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ');
}
