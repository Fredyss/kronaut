import { parseSnapshot } from '../snapshot.ts';
import { FAKE_PROVIDER } from './testing-fake.ts';

export const SEED_TEXT = 'Ahoj svet';

export interface SeedItem {
  readonly role: 'thread' | 'comment';
  readonly text: string;
}

export interface SnapshotOptions {
  readonly text?: string;
  readonly deliveryMode?: 'auto' | 'reminder';
  readonly provider?: string;
  readonly media?: readonly unknown[];
  readonly items?: readonly SeedItem[];
}

export interface SnapshotIds {
  readonly postId: string;
  readonly variantId: string;
  readonly accountId: string;
}

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

export function seedSnapshot(ids: SnapshotIds, options: SnapshotOptions) {
  return parseSnapshot({
    v: 1,
    postId: ids.postId,
    postVersion: 1,
    variants: [
      {
        id: ids.variantId,
        isDefault: true,
        contentLanguage: null,
        items: [
          {
            position: 0,
            role: 'main',
            doc: doc(options.text ?? SEED_TEXT),
            docSchemaV: 1,
            media: options.media ?? [],
          },
          ...(options.items ?? []).map((item, index) => ({
            position: index + 1,
            role: item.role,
            doc: doc(item.text),
            docSchemaV: 1,
            media: [],
          })),
        ],
      },
    ],
    destinations: [
      {
        socialAccountId: ids.accountId,
        provider: options.provider ?? FAKE_PROVIDER,
        publishType: 'post',
        variantId: ids.variantId,
        deliveryMode: options.deliveryMode ?? 'auto',
        settings: {},
      },
    ],
  });
}
