import { BlockList, isIP } from 'node:net';

const IPV4_NON_PUBLIC: readonly (readonly [string, number])[] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const IPV6_NON_PUBLIC: readonly (readonly [string, number])[] = [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['::', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
];

const ipv4NonPublic = new BlockList();
for (const [network, prefix] of IPV4_NON_PUBLIC) {
  ipv4NonPublic.addSubnet(network, prefix, 'ipv4');
}

const ipv6NonPublic = new BlockList();
for (const [network, prefix] of IPV6_NON_PUBLIC) {
  ipv6NonPublic.addSubnet(network, prefix, 'ipv6');
}

const ipv6GlobalUnicast = new BlockList();
ipv6GlobalUnicast.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }
  const family = isIP(ip);
  if (family === 4) {
    return !ipv4NonPublic.check(ip, 'ipv4');
  }
  if (family === 6) {
    if (ip.includes('%')) {
      return false;
    }
    return ipv6GlobalUnicast.check(ip, 'ipv6') && !ipv6NonPublic.check(ip, 'ipv6');
  }
  return false;
}
