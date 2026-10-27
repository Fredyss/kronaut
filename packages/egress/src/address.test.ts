import { describe, expect, it } from 'vitest';
import { isPublicAddress } from './address.ts';

const IPV4_RANGES: readonly (readonly [string, string, string])[] = [
  ['0.0.0.0/8', '0.0.0.0', '0.255.255.255'],
  ['10.0.0.0/8', '10.0.0.0', '10.255.255.255'],
  ['100.64.0.0/10', '100.64.0.0', '100.127.255.255'],
  ['127.0.0.0/8', '127.0.0.0', '127.255.255.255'],
  ['169.254.0.0/16', '169.254.0.0', '169.254.255.255'],
  ['172.16.0.0/12', '172.16.0.0', '172.31.255.255'],
  ['192.0.0.0/24', '192.0.0.0', '192.0.0.255'],
  ['192.0.2.0/24', '192.0.2.0', '192.0.2.255'],
  ['192.88.99.0/24', '192.88.99.0', '192.88.99.255'],
  ['192.168.0.0/16', '192.168.0.0', '192.168.255.255'],
  ['198.18.0.0/15', '198.18.0.0', '198.19.255.255'],
  ['198.51.100.0/24', '198.51.100.0', '198.51.100.255'],
  ['203.0.113.0/24', '203.0.113.0', '203.0.113.255'],
  ['224.0.0.0/4', '224.0.0.0', '239.255.255.255'],
  ['240.0.0.0/4', '240.0.0.0', '255.255.255.255'],
];

const IPV4_INSIDE: readonly string[] = [
  '0.1.2.3',
  '10.20.30.40',
  '100.100.100.100',
  '127.0.0.1',
  '169.254.169.254',
  '172.20.1.1',
  '192.0.0.8',
  '192.0.2.77',
  '192.88.99.1',
  '192.168.1.1',
  '198.18.5.5',
  '198.19.0.1',
  '198.51.100.9',
  '203.0.113.200',
  '230.1.2.3',
  '250.250.250.250',
];

const IPV4_JUST_OUTSIDE: readonly string[] = [
  '1.0.0.0',
  '9.255.255.255',
  '11.0.0.0',
  '100.63.255.255',
  '100.128.0.0',
  '126.255.255.255',
  '128.0.0.0',
  '169.253.255.255',
  '169.255.0.0',
  '172.15.255.255',
  '172.32.0.0',
  '191.255.255.255',
  '192.0.1.0',
  '192.0.3.0',
  '192.88.98.255',
  '192.88.100.0',
  '192.167.255.255',
  '192.169.0.0',
  '198.17.255.255',
  '198.20.0.0',
  '198.51.99.255',
  '198.51.101.0',
  '203.0.112.255',
  '203.0.114.0',
  '223.255.255.255',
];

const IPV6_RANGES: readonly (readonly [string, string, string])[] = [
  ['::/128', '::', '::'],
  ['::1/128', '::1', '::1'],
  ['::ffff:0:0/96', '::ffff:0:0', '::ffff:ffff:ffff'],
  ['::/96', '::2', '::ffff:ffff'],
  ['64:ff9b::/96', '64:ff9b::', '64:ff9b::ffff:ffff'],
  ['64:ff9b:1::/48', '64:ff9b:1::', '64:ff9b:1:ffff:ffff:ffff:ffff:ffff'],
  ['100::/64', '100::', '100::ffff:ffff:ffff:ffff'],
  ['2001::/23', '2001::', '2001:1ff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['2001:db8::/32', '2001:db8::', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['2002::/16', '2002::', '2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['3fff::/20', '3fff::', '3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['fc00::/7', 'fc00::', 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['fe80::/10', 'fe80::', 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['fec0::/10', 'fec0::', 'feff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['ff00::/8', 'ff00::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
];

const IPV6_INSIDE: readonly string[] = [
  '::5',
  '::ffff:8.8.8.8',
  '::ffff:808:808',
  '::ffff:7f00:1',
  '::FFFF:10.0.0.1',
  '0:0:0:0:0:ffff:8.8.8.8',
  '::7f00:1',
  '::127.0.0.1',
  '64:ff9b::808:808',
  '64:ff9b:1::1',
  '100::1',
  '2001::1',
  '2001:db8::1',
  '2001:db8:abcd::1',
  '2002:c000:204::1',
  '3fff::1',
  'fd12:3456:789a::1',
  'fe80::1',
  'fec0::1',
  'ff02::1',
  '1000::1',
  '0:0:0:0:0:0:0:1',
  '0000:0000:0000:0000:0000:0000:0000:0001',
];

const IPV6_JUST_OUTSIDE: readonly string[] = [
  '2001:200::1',
  '2001:4860:4860::8888',
  '2001:db7:ffff::1',
  '2001:db9::1',
  '2003::1',
  '2400:cb00::1',
  '2606:4700:4700::1111',
  '2a00:1450:4001::200e',
  '3ffe::1',
  '3fff:1000::1',
  '3fff:1000:ffff::1',
];

describe('isPublicAddress', () => {
  describe.each(IPV4_RANGES)('ipv4 %s', (_cidr, first, last) => {
    it('rejects the first and last address of the range', () => {
      expect(isPublicAddress(first)).toBe(false);
      expect(isPublicAddress(last)).toBe(false);
    });
  });

  it.each(IPV4_INSIDE)('rejects ipv4 %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(IPV4_JUST_OUTSIDE)('accepts ipv4 %s just outside a blocked range', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  describe.each(IPV6_RANGES)('ipv6 %s', (_cidr, first, last) => {
    it('rejects the first and last address of the range', () => {
      expect(isPublicAddress(first)).toBe(false);
      expect(isPublicAddress(last)).toBe(false);
    });
  });

  it.each(IPV6_INSIDE)('rejects ipv6 %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(IPV6_JUST_OUTSIDE)('accepts ipv6 %s just outside a blocked range', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111', '2001:4860:4860::8844'])(
    'accepts public %s',
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    },
  );

  it('rejects every ipv4-mapped address regardless of the embedded ipv4', () => {
    expect(isPublicAddress('::ffff:1.1.1.1')).toBe(false);
    expect(isPublicAddress('::ffff:0101:0101')).toBe(false);
    expect(isPublicAddress('0:0:0:0:0:FFFF:101:101')).toBe(false);
  });

  it('rejects addresses outside 2000::/3', () => {
    expect(isPublicAddress('1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(false);
    expect(isPublicAddress('4000::1')).toBe(false);
    expect(isPublicAddress('8000::1')).toBe(false);
    expect(isPublicAddress('c000::1')).toBe(false);
    expect(isPublicAddress('2000::1')).toBe(true);
    expect(isPublicAddress('3fff:1000::')).toBe(true);
  });

  it('rejects addresses carrying a zone id', () => {
    expect(isPublicAddress('fe80::1%eth0')).toBe(false);
    expect(isPublicAddress('fe80::1%1')).toBe(false);
    expect(isPublicAddress('2606:4700:4700::1111%eth0')).toBe(false);
    expect(isPublicAddress('::1%lo')).toBe(false);
  });

  it('rejects bracketed, non-canonical and malformed strings', () => {
    for (const value of [
      '',
      ' ',
      'localhost',
      'example.com',
      '[::1]',
      '[2606:4700:4700::1111]',
      '8.8.8.8 ',
      ' 8.8.8.8',
      '8.8.8.8\n',
      '8.8.8',
      '8.8.8.8.8',
      '8.8.8.256',
      '08.8.8.8',
      '010.0.0.1',
      '127.1',
      '0x7f.0.0.1',
      '0x08080808',
      '2130706433',
      '134744072',
      '8.8.8.8/32',
      '8.8.8.8:443',
      '::g',
      ':::',
      '1::2::3',
      '2606:4700:4700::1111:',
      '2606:4700:4700::1111/64',
      'http://8.8.8.8',
      '::1%',
      'null',
      'undefined',
    ]) {
      expect(isPublicAddress(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('rejects non-string input', () => {
    expect(isPublicAddress(undefined as unknown as string)).toBe(false);
    expect(isPublicAddress(null as unknown as string)).toBe(false);
    expect(isPublicAddress(134744072 as unknown as string)).toBe(false);
  });
});
