import { describe, expect, it } from 'vitest';
import { parseCookies, serializeCookie } from './cookies.ts';

describe('cookies', () => {
  it('serializes host-only cookies', () => {
    expect(serializeCookie('__Host-a', 'v', { maxAgeSeconds: 60 })).toBe(
      '__Host-a=v; Max-Age=60; Path=/; Secure; HttpOnly; SameSite=Lax',
    );
    expect(serializeCookie('__Host-a', '', { maxAgeSeconds: 0 })).toBe(
      '__Host-a=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax',
    );
    expect(() => serializeCookie('plain', 'v', { maxAgeSeconds: 1 })).toThrow();
    expect(() => serializeCookie('__Host-a', 'a;b', { maxAgeSeconds: 1 })).toThrow();
  });

  it('parses the first value of each cookie', () => {
    const cookies = parseCookies('a=1; b=2; a=3; broken; =x');
    expect([...cookies]).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
  });
});
