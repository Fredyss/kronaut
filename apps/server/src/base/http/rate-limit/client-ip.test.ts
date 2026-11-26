import { describe, expect, it } from 'vitest';
import { clientIp, ipSubject, socketAddress } from './client-ip.ts';

function request(headers: Record<string, string>): Request {
  return new Request('https://kronaut.example.test/v1/auth/login', { headers });
}

describe('clientIp', () => {
  it('never reads X-Forwarded-For (RL-01)', () => {
    const forged = request({ 'x-forwarded-for': '198.51.100.1' });
    expect(clientIp(forged, '10.0.0.5', true)).toBe('10.0.0.5');
    expect(clientIp(forged, '10.0.0.5', false)).toBe('10.0.0.5');
  });

  it('trusts the Cloudflare header only behind the Access gate', () => {
    const edge = request({ 'cf-connecting-ip': ' 203.0.113.7 ' });
    expect(clientIp(edge, '10.0.0.5', true)).toBe('203.0.113.7');
    expect(clientIp(edge, '10.0.0.5', false)).toBe('10.0.0.5');
  });

  it('falls back to the socket for a malformed header and drops a zone id', () => {
    expect(clientIp(request({ 'cf-connecting-ip': 'not-an-ip' }), '10.0.0.5', true)).toBe(
      '10.0.0.5',
    );
    expect(clientIp(request({}), 'fe80::1%eth0', false)).toBe('fe80::1');
    expect(clientIp(request({}), null, true)).toBeNull();
  });
});

describe('ipSubject', () => {
  it('keys IPv4 by address, mapped IPv4 as IPv4 and IPv6 by its /64', () => {
    expect(ipSubject('203.0.113.7')).toBe('203.0.113.7');
    expect(ipSubject('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(ipSubject('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
    expect(ipSubject('2001:0DB8:0001:0002:ffff::9')).toBe('2001:db8:1:2::/64');
    expect(ipSubject('::1')).toBe('0:0:0:0::/64');
    expect(ipSubject('64:ff9b::192.0.2.1')).toBe('64:ff9b:0:0::/64');
  });
});

describe('socketAddress', () => {
  it('reads the Node socket and tolerates a missing one', () => {
    expect(socketAddress({ incoming: { socket: { remoteAddress: '10.0.0.5' } } })).toBe('10.0.0.5');
    expect(socketAddress(undefined)).toBeNull();
    expect(socketAddress({})).toBeNull();
  });
});
