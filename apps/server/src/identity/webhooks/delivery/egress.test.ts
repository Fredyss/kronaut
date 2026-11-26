import {
  createHttpClient,
  EgressError,
  type EgressResponse,
  type HttpClient,
  type Resolver,
} from '@kronaut/egress';
import { describe, expect, it } from 'vitest';
import { postWebhook, WEBHOOK_EGRESS } from './egress.ts';

const REQUEST = { headers: { 'content-type': 'application/json' }, body: '{}' };

function resolving(...addresses: string[]): { resolver: Resolver; calls: () => number } {
  let calls = 0;
  const resolver: Resolver = async () => {
    calls++;
    return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
  };
  return { resolver, calls: () => calls };
}

function post(url: string, resolver?: Resolver) {
  const http = createHttpClient(WEBHOOK_EGRESS, resolver === undefined ? {} : { resolver });
  return postWebhook(http, { url, ...REQUEST });
}

describe('webhook URL guard (NET-03)', () => {
  it.each([
    ['loopback', '127.0.0.1'],
    ['private 10/8', '10.1.2.3'],
    ['private 172.16/12', '172.20.0.5'],
    ['private 192.168/16', '192.168.1.10'],
    ['carrier-grade NAT', '100.64.0.1'],
    ['cloud metadata', '169.254.169.254'],
    ['unspecified', '0.0.0.0'],
    ['IPv6 loopback', '::1'],
    ['IPv6 unique local', 'fd00::1'],
    ['IPv6 link-local', 'fe80::1'],
    ['IPv4-mapped IPv6', '::ffff:127.0.0.1'],
    ['NAT64 of metadata', '64:ff9b::a9fe:a9fe'],
  ])('refuses a host that resolves to %s before connecting', async (_name, address) => {
    const { resolver } = resolving(address);
    expect(await post('https://hooks.example.test/in', resolver)).toEqual({
      ok: false,
      status: null,
      error: 'blocked_address',
    });
  });

  it('refuses when any one resolved address is private, so the connection cannot pick it', async () => {
    const { resolver } = resolving('93.184.216.34', '10.0.0.1');
    expect(await post('https://hooks.example.test/in', resolver)).toMatchObject({
      error: 'blocked_address',
    });
  });

  it('resolves again for every delivery, so a rebinding answer never reuses an earlier check', async () => {
    const { resolver, calls } = resolving('127.0.0.1');
    await post('https://hooks.example.test/in', resolver);
    await post('https://hooks.example.test/in', resolver);
    expect(calls()).toBe(2);
  });

  it.each([
    ['plain http', 'http://hooks.example.test/in', 'blocked_scheme'],
    ['an IPv4 literal', 'https://127.0.0.1/in', 'blocked_host'],
    ['an IPv6 literal', 'https://[::1]/in', 'blocked_host'],
    ['another port', 'https://hooks.example.test:8443/in', 'blocked_port'],
    ['credentials', 'https://user:pass@hooks.example.test/in', 'blocked_host'],
  ])('refuses %s without resolving it', async (_name, url, error) => {
    const { resolver, calls } = resolving('93.184.216.34');
    expect(await post(url, resolver)).toMatchObject({ ok: false, error });
    expect(calls()).toBe(0);
  });

  it('never follows a redirect and bounds the time and the answer', () => {
    expect(WEBHOOK_EGRESS).toMatchObject({ maxRedirects: 0, allowedHosts: 'any' });
    expect(WEBHOOK_EGRESS.allowedPorts).toBeUndefined();
    expect(WEBHOOK_EGRESS.timeoutMs).toBeLessThanOrEqual(15_000);
    expect(WEBHOOK_EGRESS.maxResponseBytes).toBeLessThanOrEqual(1024 * 1024);
  });
});

function answering(status: number | Error): { http: HttpClient; discarded: () => boolean } {
  let discarded = false;
  const unread = (): never => {
    throw new Error('the receiver body must not be read');
  };
  const http: HttpClient = {
    async request(url) {
      if (status instanceof Error) throw status;
      const response: EgressResponse = {
        status,
        headers: new Headers(),
        url: String(url),
        redirected: false,
        bytes: unread,
        text: unread,
        json: unread,
        chunks: unread,
        discard: () => {
          discarded = true;
        },
      };
      return response;
    },
    fetch: () => Promise.reject(new Error('not used')),
  };
  return { http, discarded: () => discarded };
}

describe('postWebhook', () => {
  it('counts any 2xx as delivered and discards the body unread', async () => {
    const { http, discarded } = answering(204);
    expect(await postWebhook(http, { url: 'https://hooks.example.test/in', ...REQUEST })).toEqual({
      ok: true,
      status: 204,
    });
    expect(discarded()).toBe(true);
  });

  it.each([301, 400, 410, 500])('records %i as a failed attempt with its status', async (code) => {
    const { http } = answering(code);
    expect(await postWebhook(http, { url: 'https://hooks.example.test/in', ...REQUEST })).toEqual({
      ok: false,
      status: code,
      error: 'http_status',
    });
  });

  it('keeps only the egress code, never its message', async () => {
    const secretUrl = 'https://hooks.example.test/in?token=CANARY_hook_url';
    const { http } = answering(new EgressError('too_many_redirects', `redirect from ${secretUrl}`));
    const outcome = await postWebhook(http, { url: secretUrl, ...REQUEST });
    expect(outcome).toEqual({ ok: false, status: null, error: 'too_many_redirects' });
    expect(JSON.stringify(outcome)).not.toContain('CANARY');
  });
});
