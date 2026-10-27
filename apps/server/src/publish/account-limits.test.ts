import { type DraftItem, validate } from '@kronaut/compose';
import type { ProviderManifest } from '@kronaut/core';
import { manifests } from '@kronaut/providers/manifests';
import { describe, expect, it } from 'vitest';

const mastodon = manifests.find((manifest) => manifest.id === 'mastodon') as ProviderManifest;
const threads = manifests.find((manifest) => manifest.id === 'threads') as ProviderManifest;

const image = { kind: 'image', mime: 'image/png', bytes: 1000 } as const;

function post(text: string, images = 0): DraftItem[] {
  return [{ role: 'main', text, media: Array.from({ length: images }, () => image) }];
}

function capabilities(instance: Record<string, unknown>) {
  return { instance, fetchedAt: '2026-10-26T12:00:00Z' };
}

describe('mastodon validation with server limits', () => {
  it('uses the documented defaults for an account without capabilities', () => {
    expect(validate(mastodon, 'post', post('x'.repeat(500), 4))).toEqual([]);
    expect(validate(mastodon, 'post', post('x'.repeat(700), 5), {}).map((i) => i.code)).toEqual([
      'text_too_long',
      'too_many_media',
    ]);
  });

  it('lets a 1000-character server accept 700 characters', () => {
    const server = capabilities({ maxCharacters: 1000 });
    expect(validate(mastodon, 'post', post('x'.repeat(700)), server)).toEqual([]);
    expect(validate(mastodon, 'post', post('x'.repeat(1001)), server)).toEqual([
      { code: 'text_too_long', itemIndex: 0, counting: 'mastodon', limit: 1000, actual: 1001 },
    ]);
  });

  it('lets a 2-image server reject 3 images', () => {
    const server = capabilities({ maxMediaAttachments: 2 });
    expect(validate(mastodon, 'post', post('Pets', 2), server)).toEqual([]);
    expect(validate(mastodon, 'post', post('Pets', 3), server)).toEqual([
      { code: 'too_many_media', itemIndex: 0, limit: 2, actual: 3 },
    ]);
  });

  it("applies the server's MIME types, image size, URL weight and description limit", () => {
    const server = capabilities({
      supportedMimeTypes: ['image/jpeg'],
      imageSizeLimit: 500,
      charactersReservedPerUrl: 100,
      descriptionLimit: 3,
      maxCharacters: 120,
    });
    const items: DraftItem[] = [
      {
        role: 'main',
        text: `${'x'.repeat(30)} https://a.io`,
        media: [{ ...image, altText: 'four' }],
      },
    ];
    expect(validate(mastodon, 'post', items, server).map((issue) => issue.code)).toEqual([
      'text_too_long',
      'mime_unsupported',
      'file_too_large',
      'alt_text_too_long',
    ]);
  });
});

describe('threads link limit', () => {
  const links = (count: number) =>
    Array.from({ length: count }, (_, index) => `https://a.example/${index}`).join(' ');

  it('accepts 5 unique links and rejects 6', () => {
    expect(validate(threads, 'post', post(links(5)))).toEqual([]);
    expect(validate(threads, 'post', post(links(6)))).toEqual([
      { code: 'too_many_links', itemIndex: 0, limit: 5, actual: 6 },
    ]);
  });
});
