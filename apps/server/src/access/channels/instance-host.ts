import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

const MAX_HOST = 253;
const HTTPS_PREFIX = /^https:\/\//i;
const NOT_A_BARE_HOST = /[/?#@:[\]\\%\s]/;
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeInstanceHost(input: string): string | null {
  let host = input.trim().replace(HTTPS_PREFIX, '');
  if (host.endsWith('/')) host = host.slice(0, -1);
  if (host === '' || NOT_A_BARE_HOST.test(host)) return null;
  const ascii = domainToASCII(host);
  if (ascii === '' || ascii.length > MAX_HOST || isIP(ascii) !== 0) return null;
  const labels = ascii.split('.');
  return labels.length >= 2 && labels.every((label) => LABEL.test(label)) ? ascii : null;
}
