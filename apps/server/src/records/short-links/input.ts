import { HttpError } from '../../base/http/errors.ts';
import { DUB_BASE_URL, type ShortenerProvider } from './shortener.ts';

export const BASE_URL_MAX = 2048;
export const DOMAIN_MAX = 190;
export const API_KEY_MAX = 1024;

const API_SUFFIX = /\/api\/v2$/i;
const TRAILING_SLASHES = /\/+$/;
const DOMAIN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const HEADER_SAFE = /^[\x21-\x7e]+$/;
const UNSAFE_HOSTS: ReadonlySet<string> = new Set(['kutt.it']);

function refused(path: string, code: string, message: string): HttpError {
  return new HttpError('unprocessable', message, { details: [{ path, code }] });
}

function baseUrlInvalid(message: string): HttpError {
  return refused('body.baseUrl', 'base_url_invalid', message);
}

function kuttBaseUrl(value: string | undefined): string {
  if (value === undefined) throw baseUrlInvalid('Kutt needs the base URL of its instance.');
  const url = value.length > BASE_URL_MAX ? null : URL.parse(value.trim());
  const plain =
    url?.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === '';
  if (url === null || !plain) {
    throw baseUrlInvalid('The base URL must be an https link without credentials or query.');
  }
  if (UNSAFE_HOSTS.has(url.hostname)) {
    throw baseUrlInvalid('kutt.it is not run by Kutt; use https://kutt.to or your own instance.');
  }
  const path = url.pathname.replace(TRAILING_SLASHES, '').replace(API_SUFFIX, '');
  return `${url.origin}${path.replace(TRAILING_SLASHES, '')}`;
}

export function shortenerBaseUrl(provider: ShortenerProvider, value: string | undefined): string {
  if (provider === 'kutt') return kuttBaseUrl(value);
  if (value !== undefined && value.trim().replace(TRAILING_SLASHES, '') !== DUB_BASE_URL) {
    throw baseUrlInvalid(`Dub is always ${DUB_BASE_URL}.`);
  }
  return DUB_BASE_URL;
}

export function shortenerDomain(value: string | null): string | null {
  if (value === null) return null;
  const domain = value.trim().toLowerCase();
  if (domain.length > DOMAIN_MAX || !DOMAIN.test(domain)) {
    throw refused(
      'body.domain',
      'domain_invalid',
      'The domain is a host name without protocol or path.',
    );
  }
  return domain;
}

export function shortenerKey(value: string): string {
  const key = value.trim();
  if (key.length > API_KEY_MAX || !HEADER_SAFE.test(key)) {
    throw refused('body.apiKey', 'api_key_invalid', 'The API key is not valid.');
  }
  return key;
}
