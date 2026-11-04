import { describe, expect, it } from 'vitest';
import { HttpError } from '../../base/http/errors.ts';
import { shortenerBaseUrl, shortenerDomain, shortenerKey } from './input.ts';
import { dubExternalId, linkHash, utmTarget } from './target.ts';

const TAGS = 'utm_source=bluesky&utm_medium=social&utm_campaign=kronaut';

describe('utmTarget', () => {
  it.each([
    ['https://a.example.test/post', `https://a.example.test/post?${TAGS}`],
    ['https://a.example.test/p?id=4', `https://a.example.test/p?id=4&${TAGS}`],
    ['https://a.example.test/p?', `https://a.example.test/p?${TAGS}`],
    ['https://a.example.test/p#top', `https://a.example.test/p?${TAGS}#top`],
    ['https://a.example.test/p?UTM_Source=x', 'https://a.example.test/p?UTM_Source=x'],
  ])('tags %s', (link, target) => {
    expect(utmTarget(link, 'bluesky')).toBe(target);
  });

  it('refuses what is not an http link', () => {
    expect(utmTarget('https://', 'bluesky')).toBeNull();
  });

  it('derives a stable Dub external id within its 190 characters', () => {
    const id = dubExternalId('0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c10', linkHash('https://a.test/'));
    expect(id).toBe(
      dubExternalId('0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c10', linkHash('https://a.test/')),
    );
    expect(id.length).toBeLessThanOrEqual(190);
  });
});

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpError) return error.details?.[0]?.code;
    throw error;
  }
  return undefined;
}

describe('shortener input', () => {
  it('stores a Kutt base URL without /api/v2 and refuses kutt.it', () => {
    expect(shortenerBaseUrl('kutt', 'https://kutt.to')).toBe('https://kutt.to');
    expect(shortenerBaseUrl('kutt', 'https://links.example.test/api/v2/')).toBe(
      'https://links.example.test',
    );
    expect(shortenerBaseUrl('kutt', 'https://example.test/kutt/')).toBe(
      'https://example.test/kutt',
    );
    expect(codeOf(() => shortenerBaseUrl('kutt', 'https://kutt.it'))).toBe('base_url_invalid');
    expect(codeOf(() => shortenerBaseUrl('kutt', 'http://kutt.to'))).toBe('base_url_invalid');
    expect(codeOf(() => shortenerBaseUrl('kutt', 'https://u:p@kutt.to'))).toBe('base_url_invalid');
    expect(codeOf(() => shortenerBaseUrl('kutt', undefined))).toBe('base_url_invalid');
  });

  it('keeps Dub on its hosted API', () => {
    expect(shortenerBaseUrl('dub', undefined)).toBe('https://api.dub.co');
    expect(shortenerBaseUrl('dub', 'https://api.dub.co/')).toBe('https://api.dub.co');
    expect(codeOf(() => shortenerBaseUrl('dub', 'https://dub.example.test'))).toBe(
      'base_url_invalid',
    );
  });

  it('checks the domain and the key', () => {
    expect(shortenerDomain(' Go.Example.Test ')).toBe('go.example.test');
    expect(codeOf(() => shortenerDomain('https://go.example.test'))).toBe('domain_invalid');
    expect(shortenerKey(' dub_abc ')).toBe('dub_abc');
    expect(codeOf(() => shortenerKey('two words'))).toBe('api_key_invalid');
    expect(codeOf(() => shortenerKey(''))).toBe('api_key_invalid');
  });
});
