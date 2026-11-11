import { describe, expect, it } from 'vitest';
import { addressPrefix, clientPrefix } from './client-address.ts';

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://kronaut.example.test/v1/auth/login', { headers });
}

describe('addressPrefix', () => {
  it('keeps the /24 of an IPv4 address, mapped or not', () => {
    expect(addressPrefix('203.0.113.77')).toBe('203.0.113.0/24');
    expect(addressPrefix('::ffff:203.0.113.77')).toBe('203.0.113.0/24');
  });

  it('keeps the /48 of an IPv6 address however it is written', () => {
    expect(addressPrefix('2001:db8:12:3400::1')).toBe('2001:db8:12::/48');
    expect(addressPrefix('2001:0DB8:0012:0:0:0:0:1')).toBe('2001:db8:12::/48');
    expect(addressPrefix('2001:db8::1')).toBe('2001:db8:0::/48');
    expect(addressPrefix('1::2:3:4:5:6:7')).toBe('1:0:2::/48');
    expect(addressPrefix('::1')).toBe('0:0:0::/48');
    expect(addressPrefix('64:ff9b::192.0.2.1')).toBe('64:ff9b:0::/48');
  });

  it('refuses anything that is not one plain address', () => {
    const refused = [
      null,
      undefined,
      '',
      'localhost',
      '203.0.113.7, 10.0.0.1',
      '1.2.3',
      'fe80::1%eth0',
    ];
    expect(refused.map(addressPrefix)).toEqual(refused.map(() => null));
  });
});

describe('clientPrefix', () => {
  const forwarded = { 'cf-connecting-ip': '198.51.100.9', 'x-forwarded-for': '192.0.2.200' };

  it('trusts cf-connecting-ip only on a request that passed Access', () => {
    expect(clientPrefix(true, request(forwarded), '10.0.0.5')).toBe('198.51.100.0/24');
    expect(clientPrefix(false, request(forwarded), '10.0.0.5')).toBe('10.0.0.0/24');
  });

  it('falls back to the connecting address and never reads X-Forwarded-For', () => {
    expect(clientPrefix(true, request({ 'cf-connecting-ip': 'nonsense' }), '10.0.0.5')).toBe(
      '10.0.0.0/24',
    );
    expect(clientPrefix(true, request({ 'x-forwarded-for': '192.0.2.200' }), undefined)).toBeNull();
  });
});
