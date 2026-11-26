import { describe, expect, it } from 'vitest';
import {
  endpointDescription,
  endpointEvents,
  endpointUrl,
  newSigningSecret,
  URL_MAX,
} from './input.ts';

describe('endpointUrl', () => {
  it('keeps an https link with a host name', () => {
    expect(endpointUrl(' https://hooks.example.test/in?t=1 ')).toBe(
      'https://hooks.example.test/in?t=1',
    );
    expect(endpointUrl('https://hooks.example.test:443/in')).toBe('https://hooks.example.test/in');
  });

  it.each([
    'http://hooks.example.test/in',
    'https://127.0.0.1/in',
    'https://[::1]/in',
    'https://[fd00::1]/in',
    'https://hooks.example.test:8443/in',
    'https://user:pass@hooks.example.test/in',
    'ftp://hooks.example.test/in',
    'not a url',
    `https://hooks.example.test/${'a'.repeat(URL_MAX)}`,
  ])('refuses %s', (url) => {
    expect(() => endpointUrl(url)).toThrow(expect.objectContaining({ status: 422 }));
  });
});

describe('endpointEvents', () => {
  it('dedupes and keeps the frozen order', () => {
    expect(endpointEvents(['post.completed', 'destination.failed', 'post.completed'])).toEqual([
      'destination.failed',
      'post.completed',
    ]);
  });
});

describe('endpointDescription', () => {
  it('trims to NFC and stores an empty one as null', () => {
    expect(endpointDescription('  Café ')).toBe('Café');
    expect(endpointDescription('   ')).toBeNull();
    expect(endpointDescription(null)).toBeNull();
    expect(() => endpointDescription('x'.repeat(201))).toThrow();
  });
});

describe('newSigningSecret', () => {
  it('makes a Standard Webhooks secret of 32 random bytes', () => {
    const secret = newSigningSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{43}=$/);
    expect(Buffer.from(secret.slice(6), 'base64')).toHaveLength(32);
    expect(newSigningSecret()).not.toBe(secret);
  });
});
