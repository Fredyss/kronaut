import { describe, expect, it } from 'vitest';
import { normalizeInstanceHost } from './instance-host.ts';

describe('normalizeInstanceHost', () => {
  it.each([
    ['Mastodon.Social', 'mastodon.social'],
    ['https://mastodon.social', 'mastodon.social'],
    ['https://mastodon.social/', 'mastodon.social'],
    ['  HTTPS://Mastodon.Social/ ', 'mastodon.social'],
    ['bücher.example', 'xn--bcher-kva.example'],
    ['xn--bcher-kva.example', 'xn--bcher-kva.example'],
  ])('accepts %j as %j', (input, host) => {
    expect(normalizeInstanceHost(input)).toBe(host);
  });

  it.each([
    'mastodon.social:443',
    'https://mastodon.social:8443',
    'mastodon.social/about',
    'https://mastodon.social/@alice',
    'https://mastodon.social?x=1',
    'https://mastodon.social#x',
    'alice@mastodon.social',
    'https://user:pass@mastodon.social',
    'http://mastodon.social',
    'ftp://mastodon.social',
    'localhost',
    'mastodon',
    '192.168.1.10',
    '127.1',
    '0x7f.0.0.1',
    '[::1]',
    '::1',
    'mastodon.social.',
    'bad_label.example',
    '-bad.example',
    'mast odon.social',
    'mastodon%2esocial',
    '',
    'https://',
    `${`${'a'.repeat(60)}.`.repeat(4)}${'b'.repeat(10)}.example`,
  ])('rejects %j', (input) => {
    expect(normalizeInstanceHost(input)).toBeNull();
  });
});
