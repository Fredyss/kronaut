import { isIP } from 'node:net';
import { EgressError } from './errors.ts';

export interface EgressPolicy {
  allowedHosts: readonly string[] | 'any';
  allowedPorts?: readonly number[];
  maxResponseBytes: number;
  timeoutMs: number;
  maxRedirects: number;
}

const DEFAULT_PORTS: readonly number[] = [443];

export function parseUrl(input: string | URL, base?: URL): URL {
  try {
    return new URL(input, base);
  } catch (cause) {
    throw new EgressError('blocked_host', 'invalid url', { cause });
  }
}

function hostAllowed(host: string, allowedHosts: readonly string[] | 'any'): boolean {
  if (allowedHosts === 'any') {
    return true;
  }
  return allowedHosts.some((entry) => {
    const pattern = entry.toLowerCase();
    if (!pattern.startsWith('*.')) {
      return host === pattern;
    }
    const suffix = pattern.slice(1);
    if (!host.endsWith(suffix)) {
      return false;
    }
    const labels = host.slice(0, host.length - suffix.length).split('.');
    return labels.every((label) => label.length > 0);
  });
}

export function assertAllowed(url: URL, policy: EgressPolicy): void {
  if (url.protocol !== 'https:') {
    throw new EgressError('blocked_scheme', 'only https is allowed');
  }
  if (url.username !== '' || url.password !== '') {
    throw new EgressError('blocked_host', 'credentials in url are not allowed');
  }
  const host = url.hostname.toLowerCase();
  if (host.startsWith('[') || isIP(host) !== 0) {
    throw new EgressError('blocked_host', 'ip literal hosts are not allowed');
  }
  if (!hostAllowed(host, policy.allowedHosts)) {
    throw new EgressError('blocked_host', `host ${host} is not allowed`);
  }
  const port = url.port === '' ? 443 : Number(url.port);
  if (!(policy.allowedPorts ?? DEFAULT_PORTS).includes(port)) {
    throw new EgressError('blocked_port', `port ${port} is not allowed`);
  }
}
