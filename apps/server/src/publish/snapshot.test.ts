import { contentHash, toHex } from '@kronaut/compose';
import { describe, expect, it } from 'vitest';
import {
  contentHashInput,
  draftItems,
  parseSnapshot,
  publishItems,
  resolveDestination,
  SnapshotError,
} from './snapshot.ts';

const POST = '01920000-0000-7000-8000-000000000001';
const VARIANT = '01920000-0000-7000-8000-000000000002';
const ACCOUNT = '01920000-0000-7000-8000-000000000003';
const ASSET = '01920000-0000-7000-8000-000000000004';

function doc(...paragraphs: string[]) {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  };
}

const snapshot = parseSnapshot({
  v: 1,
  postId: POST,
  postVersion: 3,
  variants: [
    {
      id: VARIANT,
      isDefault: true,
      contentLanguage: 'sk',
      items: [
        { position: 1, role: 'thread', doc: doc('second'), docSchemaV: 1, media: [] },
        {
          position: 0,
          role: 'main',
          doc: doc('Ahoj', 'svet'),
          docSchemaV: 1,
          media: [
            {
              assetId: ASSET,
              sha256: 'a'.repeat(64),
              kind: 'image',
              mime: 'image/jpeg',
              bytes: 1000,
              width: 1080,
              height: 1350,
              altText: 'Mačka',
              aiGenerated: false,
              transform: null,
            },
          ],
        },
      ],
    },
  ],
  destinations: [
    {
      socialAccountId: ACCOUNT,
      provider: 'bluesky',
      publishType: 'post',
      variantId: VARIANT,
      deliveryMode: 'auto',
      settings: {},
    },
  ],
});

describe('snapshot', () => {
  it('resolves a destination with items in position order', () => {
    const resolved = resolveDestination(snapshot, {
      socialAccountId: ACCOUNT.toUpperCase(),
      publishType: 'post',
    });
    expect(resolved.items.map((i) => i.position)).toEqual([0, 1]);
    expect(publishItems(resolved)).toEqual([
      {
        position: 0,
        role: 'main',
        text: 'Ahoj\nsvet',
        media: [
          {
            id: ASSET,
            sha256: 'a'.repeat(64),
            mime: 'image/jpeg',
            bytes: 1000,
            width: 1080,
            height: 1350,
            altText: 'Mačka',
            aiGenerated: false,
          },
        ],
        language: 'sk',
      },
      { position: 1, role: 'thread', text: 'second', media: [], language: 'sk' },
    ]);
    expect(draftItems(resolved)[0]?.media[0]).toEqual({
      kind: 'image',
      mime: 'image/jpeg',
      bytes: 1000,
      width: 1080,
      height: 1350,
      altText: 'Mačka',
    });
  });

  it('hashes the same content identically regardless of item order in the snapshot', async () => {
    const resolved = resolveDestination(snapshot, {
      socialAccountId: ACCOUNT,
      publishType: 'post',
    });
    const reordered = parseSnapshot({
      ...snapshot,
      variants: snapshot.variants.map((v) => ({ ...v, items: [...v.items].reverse() })),
    });
    const again = resolveDestination(reordered, { socialAccountId: ACCOUNT, publishType: 'post' });
    expect(toHex(await contentHash(contentHashInput(resolved)))).toBe(
      toHex(await contentHash(contentHashInput(again))),
    );
  });

  it('fails on a missing destination or variant', () => {
    expect(() =>
      resolveDestination(snapshot, { socialAccountId: ACCOUNT, publishType: 'story' }),
    ).toThrow(SnapshotError);
    const orphan = parseSnapshot({
      ...snapshot,
      destinations: [{ ...snapshot.destinations[0], variantId: ASSET }],
    });
    expect(() =>
      resolveDestination(orphan, { socialAccountId: ACCOUNT, publishType: 'post' }),
    ).toThrow(/variant_missing/);
  });

  it('rejects malformed snapshots', () => {
    expect(() => parseSnapshot({ ...snapshot, v: 2 })).toThrow();
    expect(() =>
      parseSnapshot({
        ...snapshot,
        variants: [{ ...snapshot.variants[0], items: [] }],
      }),
    ).toThrow();
  });
});
